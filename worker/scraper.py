import asyncio
import re
import random
from datetime import datetime, timezone
from typing import List, Dict, Optional, Set
from playwright.async_api import Page, BrowserContext

from worker.config import config
from worker.logger import JobLogger
from worker.browser import human_delay

# Regex to extract lat/lng from Google Maps URL
LAT_LNG_PATTERN = re.compile(r"@(-?\d+\.\d+),(-?\d+\.\d+)")
PLACE_ID_PATTERN = re.compile(r"place/([^/]+)/")


def build_search_query(keyword: str, city: str = None, province: str = None, country: str = None) -> str:
    parts = [keyword]
    if city:
        parts.append(city)
    if province:
        parts.append(province)
    if country and country.lower() != "indonesia":
        parts.append(country)
    return " ".join(parts)


def extract_lat_lng(url: str) -> tuple[Optional[float], Optional[float]]:
    if not url:
        return None, None
    match = LAT_LNG_PATTERN.search(url)
    if match:
        return float(match.group(1)), float(match.group(2))
    return None, None


def normalize_url(url: str) -> Optional[str]:
    if not url:
        return None
    # Extract stable place URL (remove trailing params)
    match = re.search(r"(https://www\.google\.com/maps/place/[^?#]+)", url)
    if match:
        return match.group(1).rstrip("/")
    return url.split("?")[0]


class GoogleMapsScraper:
    def __init__(self, job_id: str, context: BrowserContext, logger: JobLogger):
        self.job_id = job_id
        self.context = context
        self.logger = logger
        self.seen_urls: Set[str] = set()
        self.seen_name_addr: Set[str] = set()

    async def search_and_scrape(
        self,
        keyword: str,
        country: str = "Indonesia",
        province: str = None,
        city: str = None,
        district: str = None,
        on_place_found=None,
        on_progress=None,
    ) -> List[Dict]:
        query = build_search_query(keyword, district or city, province, country)
        self.logger.info(f"Search query: {query}")

        page = await self.context.new_page()

        # Block images, fonts, media — keep JS & CSS for dynamic rendering
        await page.route("**/*.{png,jpg,jpeg,gif,webp,woff,woff2,ttf,otf,mp4,mp3}", lambda r: r.abort())

        try:
            maps_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
            self.logger.info("Opening Google Maps...")
            await page.goto(maps_url, wait_until="domcontentloaded", timeout=config.PLAYWRIGHT_TIMEOUT)
            await human_delay(2000, 3000)

            await self._handle_consent(page)

            # ── PHASE 1: Collect all result cards from search list ──
            self.logger.info("Collecting result cards...")
            cards_data = await self._collect_cards_by_scrolling(page, on_progress)
            total_found = len(cards_data)

            self.logger.info(f"Collected {total_found} cards from search results")
            if on_progress:
                await on_progress(total_found=total_found, total_scraped=0)

            # ── PHASE 2: Enrich each card (open detail only if needed) ──
            results = []
            for i, card in enumerate(cards_data):
                try:
                    enriched = await self._enrich_card(page, card, i + 1)
                    if enriched:
                        results.append(enriched)
                        if on_place_found:
                            await on_place_found(enriched)
                        if on_progress:
                            await on_progress(total_found=total_found, total_scraped=i + 1)
                except Exception as e:
                    self.logger.warning(f"Failed to enrich #{i+1}: {e}")
                    # Still save what we have from card
                    if card.get("place_name"):
                        results.append(card)
                        if on_place_found:
                            await on_place_found(card)
                        if on_progress:
                            await on_progress(total_found=total_found, total_scraped=i + 1)

            return results

        finally:
            await page.close()

    async def _handle_consent(self, page: Page):
        try:
            for selector in [
                'button:has-text("Accept all")',
                'button:has-text("Setuju semua")',
                'button:has-text("Tolak semua")',
                'form:nth-child(2) button',
            ]:
                btn = page.locator(selector)
                if await btn.count() > 0:
                    await btn.first.click()
                    await human_delay(800, 1200)
                    self.logger.info("Cookie consent handled")
                    break
        except Exception:
            pass

    async def _collect_cards_by_scrolling(self, page: Page, on_progress=None) -> List[Dict]:
        """
        Scroll the results panel and extract basic data from each card.
        Much faster than opening each place individually.
        """
        cards: List[Dict] = []
        seen_names: Set[str] = set()
        no_new_count = 0
        scroll_count = 0
        max_scrolls = 100

        # Wait for results panel
        try:
            await page.wait_for_selector('[role="feed"], .Nv2PK', timeout=10000)
        except Exception:
            self.logger.warning("Results panel not found, trying alternate approach")

        while scroll_count < max_scrolls:
            # Extract all visible cards
            new_cards = await self._extract_visible_cards(page)
            new_found = 0

            for card in new_cards:
                name = card.get("place_name", "")
                url_key = normalize_url(card.get("maps_url", ""))
                dedup_key = url_key or name

                if dedup_key and dedup_key not in seen_names:
                    seen_names.add(dedup_key)
                    card["job_id"] = self.job_id
                    cards.append(card)
                    new_found += 1

            if new_found == 0:
                no_new_count += 1
            else:
                no_new_count = 0
                self.logger.info(f"Found {len(cards)} places so far...")
                if on_progress:
                    await on_progress(total_found=len(cards), total_scraped=0)

            # Check end of list
            end_markers = await page.locator(
                'span:has-text("You\'ve reached the end"), '
                'span:has-text("end of the list"), '
                'p.fontBodyMedium:has-text("end")'
            ).count()
            if end_markers > 0 or no_new_count >= 4:
                self.logger.info(f"Reached end of results ({len(cards)} total)")
                break

            # Scroll results panel
            try:
                feed = page.locator('[role="feed"]')
                if await feed.count() > 0:
                    await feed.evaluate("el => el.scrollBy(0, 800)")
                else:
                    await page.keyboard.press("PageDown")
            except Exception:
                await page.evaluate("window.scrollBy(0, 800)")

            await human_delay(600, 1000)
            scroll_count += 1

        return cards

    async def _extract_visible_cards(self, page: Page) -> List[Dict]:
        """Extract data from all currently visible result cards."""
        try:
            # Use page.evaluate for batch extraction — much faster than per-element Playwright calls
            cards = await page.evaluate("""
                () => {
                    const results = [];
                    // Try different selectors for result cards
                    const items = document.querySelectorAll('.Nv2PK, [data-result-index], [jsaction*="placeCard"]');

                    items.forEach(item => {
                        try {
                            // Place name
                            const nameEl = item.querySelector('.qBF1Pd, .fontHeadlineSmall, h3, [class*="fontHeadline"]');
                            const name = nameEl ? nameEl.textContent.trim() : null;
                            if (!name) return;

                            // Link/URL
                            const linkEl = item.querySelector('a[href*="/maps/place/"]');
                            const url = linkEl ? linkEl.href : null;

                            // Rating
                            const ratingEl = item.querySelector('.MW4etd, [aria-label*="stars"], .ZkP5Je');
                            let rating = null;
                            if (ratingEl) {
                                const ratingText = ratingEl.getAttribute('aria-label') || ratingEl.textContent;
                                const ratingMatch = ratingText.match(/(\d+[.,]\d+)/);
                                if (ratingMatch) rating = parseFloat(ratingMatch[1].replace(',', '.'));
                            }

                            // Reviews count
                            const reviewsEl = item.querySelector('.UY7F9, [aria-label*="review"], .e4rVHe');
                            let reviews = null;
                            if (reviewsEl) {
                                const reviewText = reviewsEl.getAttribute('aria-label') || reviewsEl.textContent;
                                const reviewMatch = reviewText.replace(/[,.]/g, '').match(/(\d+)/);
                                if (reviewMatch) reviews = parseInt(reviewMatch[1]);
                            }

                            // Category
                            const catEl = item.querySelector('.W4Efsd .W4Efsd:first-child span:first-child, .DkEaL');
                            const category = catEl ? catEl.textContent.trim().replace(/^·\s*/, '') : null;

                            // Address (usually in the second info row)
                            const infoEls = item.querySelectorAll('.W4Efsd .W4Efsd span');
                            let address = null;
                            infoEls.forEach(el => {
                                const text = el.textContent.trim();
                                if (text && text.length > 10 && !text.includes('·') && text !== category) {
                                    address = text;
                                }
                            });

                            // Phone
                            const phoneEl = Array.from(item.querySelectorAll('span')).find(el =>
                                /^\+?[\d\s\-()]{8,}$/.test(el.textContent.trim())
                            );
                            const phone = phoneEl ? phoneEl.textContent.trim() : null;

                            results.push({ place_name: name, maps_url: url, rating, reviews, category, address, phone });
                        } catch(e) {}
                    });

                    return results;
                }
            """)
            return cards or []
        except Exception as e:
            self.logger.warning(f"Card extraction error: {e}")
            return []

    async def _enrich_card(self, page: Page, card: Dict, index: int) -> Optional[Dict]:
        """
        Open place detail page to get missing fields: phone, address, website, lat/lng.
        Skip if we already have all important data.
        """
        url = card.get("maps_url")
        if not url:
            return card

        # Check if we need to enrich (missing lat/lng or website)
        needs_detail = not card.get("latitude") or not card.get("website")

        if not needs_detail and card.get("address") and card.get("phone"):
            # Already have enough data from card, just extract lat/lng from URL
            lat, lng = extract_lat_lng(url)
            card["latitude"] = lat
            card["longitude"] = lng
            card["maps_url"] = normalize_url(url)
            self.logger.info(f"#{index} {card['place_name'][:40]} (from card, no detail needed)")
            return card

        # Need to open detail page
        self.logger.info(f"#{index} Opening detail: {card.get('place_name', '')[:40]}...")

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=config.PLAYWRIGHT_TIMEOUT)
            await human_delay(1200, 2000)  # shorter delay since we trust the data

            current_url = page.url
            lat, lng = extract_lat_lng(current_url)

            # Get missing fields only
            if not card.get("address"):
                card["address"] = await self._get_text(page, [
                    'button[data-item-id="address"] .Io6YTe',
                    'button[aria-label*="Address"] .Io6YTe',
                ])

            if not card.get("phone"):
                phone_raw = await self._get_text(page, [
                    'button[data-item-id*="phone"] .Io6YTe',
                    'button[aria-label*="Phone"] .Io6YTe',
                ])
                if phone_raw:
                    card["phone"] = re.sub(r"[^\d+\-\s()]", "", phone_raw).strip()

            if not card.get("website"):
                card["website"] = await self._get_attr(page, [
                    'a[data-item-id="authority"]',
                    'a[aria-label*="website"]',
                ], "href")

            if not card.get("category"):
                card["category"] = await self._get_text(page, ['button.DkEaL', '.DkEaL'])

            card["latitude"] = lat
            card["longitude"] = lng
            card["maps_url"] = normalize_url(current_url) or normalize_url(url)

        except Exception as e:
            self.logger.warning(f"Detail page failed for #{index}: {e}, using card data")
            lat, lng = extract_lat_lng(url)
            card["latitude"] = lat
            card["longitude"] = lng
            card["maps_url"] = normalize_url(url)

        # Deduplication check
        dedup_key = f"{card.get('place_name')}|{card.get('address')}"
        if dedup_key in self.seen_name_addr:
            self.logger.warning(f"Duplicate skipped: {card.get('place_name')}")
            return None
        self.seen_name_addr.add(dedup_key)

        return card

    async def _get_text(self, page: Page, selectors: List[str]) -> Optional[str]:
        for selector in selectors:
            try:
                el = page.locator(selector).first
                if await el.count() > 0:
                    text = await el.inner_text(timeout=2000)
                    if text and text.strip():
                        return text.strip()
            except Exception:
                continue
        return None

    async def _get_attr(self, page: Page, selectors: List[str], attr: str) -> Optional[str]:
        for selector in selectors:
            try:
                el = page.locator(selector).first
                if await el.count() > 0:
                    val = await el.get_attribute(attr, timeout=2000)
                    if val and val.strip():
                        return val.strip()
            except Exception:
                continue
        return None