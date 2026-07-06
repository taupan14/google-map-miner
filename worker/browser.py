import random
import asyncio
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from worker.config import config


async def create_stealth_browser() -> tuple:
    """
    Create a Playwright browser with anti-detection measures.
    Returns (playwright, browser, context)
    """
    pw = await async_playwright().start()

    browser = await pw.chromium.launch(
        headless=config.HEADLESS,
        args=[
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-extensions",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--disable-backgrounding-occluded-windows",
        ]
    )

    user_agent = random.choice(config.USER_AGENTS)
    viewport = random.choice(config.VIEWPORTS)

    context = await browser.new_context(
        user_agent=user_agent,
        viewport=viewport,
        locale="id-ID",
        timezone_id="Asia/Jakarta",
        extra_http_headers={
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        },
        ignore_https_errors=True,
    )

    # Inject stealth scripts
    await context.add_init_script("""
        // Remove webdriver flag
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });

        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });

        // Mock languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['id-ID', 'id', 'en-US', 'en'],
        });

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
            parameters.name === 'notifications'
                ? Promise.resolve({ state: Notification.permission })
                : originalQuery(parameters);

        // Hide automation
        window.chrome = {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {},
        };
    """)

    return pw, browser, context


async def human_delay(min_ms: int = None, max_ms: int = None):
    """Simulate human-like delay."""
    min_ms = min_ms or config.SCROLL_DELAY_MIN
    max_ms = max_ms or config.SCROLL_DELAY_MAX
    delay = random.uniform(min_ms, max_ms) / 1000
    await asyncio.sleep(delay)


async def human_scroll(page: Page, times: int = 3):
    """Simulate human-like scrolling behavior."""
    for _ in range(times):
        scroll_amount = random.randint(300, 600)
        await page.evaluate(f"window.scrollBy(0, {scroll_amount})")
        await asyncio.sleep(random.uniform(0.2, 0.5))
