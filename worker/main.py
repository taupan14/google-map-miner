"""
Map Miner Worker
================
Polls Supabase for pending jobs and runs them one at a time.
Supports resume on restart.

Usage:
    python -m worker.main
    python -m worker.main --job-id <specific-job-id>
"""

import asyncio
import sys
import argparse
from datetime import datetime, timezone

from worker.db import get_supabase
from worker.job_runner import JobRunner


POLL_INTERVAL = 5  # seconds between polls


async def run_single_job(job_id: str):
    """Run a specific job by ID."""
    print(f"[Worker] Running job: {job_id}")
    runner = JobRunner(job_id)
    await runner.run()


async def poll_loop():
    """
    Continuously poll for pending or stuck running jobs.
    Handles resume: picks up 'running' jobs that were interrupted.
    """
    db = get_supabase()
    print(f"[Worker] Starting poll loop (interval: {POLL_INTERVAL}s)")
    print(f"[Worker] Waiting for jobs...")

    while True:
        try:
            # Check for pending jobs first
            result = (
                db.table("jobs")
                .select("id, keyword, status")
                .in_("status", ["pending", "running"])
                .order("created_at")
                .limit(1)
                .execute()
            )

            if result.data:
                job = result.data[0]
                job_id = job["id"]
                status = job["status"]

                if status == "running":
                    print(f"[Worker] Resuming interrupted job: {job_id} ({job['keyword']})")
                else:
                    print(f"[Worker] Picked up new job: {job_id} ({job['keyword']})")

                try:
                    runner = JobRunner(job_id)
                    await runner.run()
                except Exception as e:
                    print(f"[Worker] Job {job_id} failed: {e}")

            else:
                # No jobs, wait
                await asyncio.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            print("\n[Worker] Shutting down...")
            break
        except Exception as e:
            print(f"[Worker] Poll error: {e}")
            await asyncio.sleep(POLL_INTERVAL)


async def main():
    parser = argparse.ArgumentParser(description="Map Miner Worker")
    parser.add_argument("--job-id", type=str, help="Run a specific job by ID")
    args = parser.parse_args()

    if args.job_id:
        await run_single_job(args.job_id)
    else:
        await poll_loop()


if __name__ == "__main__":
    asyncio.run(main())
