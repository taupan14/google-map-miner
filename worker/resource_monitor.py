import asyncio
import psutil
import os
from datetime import datetime, timezone
from typing import List, Dict
from worker.db import get_supabase


class ResourceMonitor:
    """
    Tracks CPU & RAM usage of the worker process every N seconds.
    Saves snapshots to job_resource_logs and final summary to job_metrics.
    """

    def __init__(self, job_id: str, interval: int = 5):
        self.job_id = job_id
        self.interval = interval
        self.db = get_supabase()
        self.process = psutil.Process(os.getpid())
        self._running = False
        self._task: asyncio.Task = None
        self._snapshots: List[Dict] = []
        self._bandwidth_start = psutil.net_io_counters()

    async def start(self):
        self._running = True
        self._task = asyncio.create_task(self._loop())

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self):
        while self._running:
            await self._record()
            await asyncio.sleep(self.interval)

    async def _record(self):
        try:
            cpu = self.process.cpu_percent(interval=None)
            mem = self.process.memory_info().rss / (1024 * 1024)  # MB

            snapshot = {
                "job_id": self.job_id,
                "cpu_percent": round(cpu, 2),
                "memory_mb": round(mem, 2),
                "recorded_at": datetime.now(timezone.utc).isoformat(),
            }
            self._snapshots.append(snapshot)

            self.db.table("job_resource_logs").insert(snapshot).execute()
        except Exception as e:
            print(f"[ResourceMonitor] Error recording: {e}")

    def get_summary(self) -> Dict:
        if not self._snapshots:
            return {}

        cpus = [s["cpu_percent"] for s in self._snapshots]
        mems = [s["memory_mb"] for s in self._snapshots]

        # Calculate bandwidth
        net_end = psutil.net_io_counters()
        bytes_sent = net_end.bytes_sent - self._bandwidth_start.bytes_sent
        bytes_recv = net_end.bytes_recv - self._bandwidth_start.bytes_recv
        bandwidth_mb = (bytes_sent + bytes_recv) / (1024 * 1024)

        return {
            "cpu_avg": round(sum(cpus) / len(cpus), 2),
            "cpu_peak": round(max(cpus), 2),
            "memory_avg_mb": round(sum(mems) / len(mems), 2),
            "memory_peak_mb": round(max(mems), 2),
            "bandwidth_mb": round(bandwidth_mb, 2),
        }

    async def save_metrics(self, started_at, finished_at, total_found: int, total_saved: int):
        summary = self.get_summary()
        duration = int((finished_at - started_at).total_seconds()) if started_at and finished_at else None

        try:
            self.db.table("job_metrics").upsert({
                "job_id": self.job_id,
                "started_at": started_at.isoformat() if started_at else None,
                "finished_at": finished_at.isoformat() if finished_at else None,
                "duration_seconds": duration,
                "total_places_found": total_found,
                "total_places_saved": total_saved,
                **summary,
            }, on_conflict="job_id").execute()
        except Exception as e:
            print(f"[ResourceMonitor] Error saving metrics: {e}")
