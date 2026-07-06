from datetime import datetime, timezone
from worker.db import get_supabase


class JobLogger:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.db = get_supabase()

    def _log(self, level: str, message: str):
        timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level.upper()}] {message}")
        try:
            self.db.table("job_logs").insert({
                "job_id": self.job_id,
                "level": level,
                "message": message,
            }).execute()
        except Exception as e:
            print(f"[LOGGER ERROR] Failed to write log: {e}")

    def info(self, message: str):
        self._log("info", message)

    def success(self, message: str):
        self._log("success", message)

    def warning(self, message: str):
        self._log("warning", message)

    def error(self, message: str):
        self._log("error", message)
