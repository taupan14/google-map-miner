import asyncio
from datetime import datetime, timezone
from typing import Dict, Any

from worker.db import get_supabase
from worker.logger import JobLogger
from worker.browser import create_stealth_browser
from worker.scraper import GoogleMapsScraper
from worker.resource_monitor import ResourceMonitor


class JobRunner:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.db = get_supabase()
        self.logger = JobLogger(job_id)
        self.monitor = ResourceMonitor(job_id)

    async def run(self):
        started_at = datetime.now(timezone.utc)

        try:
            job = await self._get_job()
            if not job:
                print(f"[JobRunner] Job {self.job_id} not found")
                return

            if job["status"] == "cancelled":
                self.logger.warning("Job was cancelled before start")
                return

            await self._update_job(status="running", started_at=started_at.isoformat())
            self.logger.info("Job Started")
            self.logger.info(
                f"Keyword: {job['keyword']} | "
                f"Location: {' '.join(filter(None, [job.get('city'), job.get('province')]))}"
            )

            await self.monitor.start()

            existing = self.db.table("places") \
                .select("maps_url") \
                .eq("job_id", self.job_id) \
                .execute()
            existing_urls = {p["maps_url"] for p in (existing.data or []) if p.get("maps_url")}
            if existing_urls:
                self.logger.info(f"Resuming from {len(existing_urls)} previously scraped places")

            self.logger.info("Launching browser...")
            pw, browser, context = await create_stealth_browser()

            state = {"total_found": len(existing_urls), "total_saved": len(existing_urls)}

            try:
                scraper = GoogleMapsScraper(self.job_id, context, self.logger)
                scraper.seen_urls.update(existing_urls)

                async def on_place_found(place):
                    saved = await self._save_place(place)
                    if saved:
                        state["total_saved"] += 1
                        await self._update_job(total_scraped=state["total_saved"])

                async def on_progress(total_found=0, total_scraped=0):
                    state["total_found"] = total_found
                    await self._update_job(
                        total_found=total_found,
                        total_scraped=state["total_saved"],
                    )

                await scraper.search_and_scrape(
                    keyword=job["keyword"],
                    country=job.get("country", "Indonesia"),
                    province=job.get("province"),
                    city=job.get("city"),
                    district=job.get("district"),
                    on_place_found=on_place_found,
                    on_progress=on_progress,
                )

            finally:
                await context.close()
                await browser.close()
                await pw.stop()

            finished_at = datetime.now(timezone.utc)
            await self.monitor.stop()
            await self.monitor.save_metrics(
                started_at, finished_at,
                state["total_found"], state["total_saved"]
            )

            await self._update_job(
                status="completed",
                finished_at=finished_at.isoformat(),
                total_found=state["total_found"],
                total_scraped=state["total_saved"],
            )
            self.logger.success(f"Job completed! Saved {state['total_saved']} places.")

        except asyncio.CancelledError:
            self.logger.warning("Job cancelled")
            await self._update_job(status="cancelled")
            raise

        except Exception as e:
            self.logger.error(f"Job failed: {str(e)}")
            await self._update_job(status="failed", error_message=str(e))
            raise

        finally:
            await self.monitor.stop()

    async def _get_job(self):
        result = self.db.table("jobs").select("*").eq("id", self.job_id).maybe_single().execute()
        return result.data

    async def _update_job(self, **kwargs):
        try:
            self.db.table("jobs").update(kwargs).eq("id", self.job_id).execute()
        except Exception as e:
            print(f"[JobRunner] Failed to update job: {e}")

    async def _save_place(self, place: Dict) -> bool:
        try:
            result = self.db.table("places").upsert(
                place,
                on_conflict="job_id,maps_url",
                ignore_duplicates=True,
            ).execute()
            return bool(result.data)
        except Exception:
            try:
                result = self.db.table("places").upsert(
                    place,
                    on_conflict="job_id,place_name,address",
                    ignore_duplicates=True,
                ).execute()
                return bool(result.data)
            except Exception:
                self.logger.warning(f"Skipped duplicate: {place.get('place_name')}")
                return False
