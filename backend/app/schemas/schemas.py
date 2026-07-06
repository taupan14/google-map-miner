from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class LogLevel(str, Enum):
    info = "info"
    success = "success"
    warning = "warning"
    error = "error"


# ── Job Schemas ──────────────────────────────────────────────

class JobCreate(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=200)
    country: str = Field(default="Indonesia")
    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None


class JobResponse(BaseModel):
    id: str
    keyword: str
    country: str
    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    status: JobStatus
    total_found: int = 0
    total_scraped: int = 0
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    jobs: List[JobResponse]
    total: int


# ── Place Schemas ─────────────────────────────────────────────

class PlaceResponse(BaseModel):
    id: int
    job_id: str
    place_name: str
    category: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    maps_url: Optional[str] = None
    created_at: datetime


class PlacesListResponse(BaseModel):
    places: List[PlaceResponse]
    total: int


# ── Log Schemas ───────────────────────────────────────────────

class JobLogResponse(BaseModel):
    id: int
    job_id: str
    level: LogLevel
    message: str
    created_at: datetime


class JobLogsResponse(BaseModel):
    logs: List[JobLogResponse]


# ── Metrics Schemas ───────────────────────────────────────────

class JobMetricsResponse(BaseModel):
    id: Optional[int] = None
    job_id: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    total_places_found: Optional[int] = None
    total_places_saved: Optional[int] = None
    cpu_avg: Optional[float] = None
    cpu_peak: Optional[float] = None
    memory_avg_mb: Optional[float] = None
    memory_peak_mb: Optional[float] = None
    bandwidth_mb: Optional[float] = None


# ── Dashboard Schemas ─────────────────────────────────────────

class DashboardStats(BaseModel):
    total_jobs: int = 0
    total_places: int = 0
    running_jobs: int = 0
    success_rate: float = 0.0
