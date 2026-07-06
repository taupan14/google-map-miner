from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from supabase import Client
from app.core.supabase import get_supabase
from app.schemas.schemas import (
    JobCreate, JobResponse, JobListResponse,
    PlacesListResponse, JobLogsResponse,
    JobMetricsResponse, DashboardStats
)
from app.services.export_service import generate_xlsx
import io

router = APIRouter()


# ── Dashboard Stats ───────────────────────────────────────────

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: Client = Depends(get_supabase)):
    result = db.rpc("get_dashboard_stats").execute()
    data = result.data or {}
    return DashboardStats(**data)


# ── Jobs CRUD ─────────────────────────────────────────────────

@router.post("/jobs", response_model=JobResponse, status_code=201)
async def create_job(payload: JobCreate, db: Client = Depends(get_supabase)):
    result = db.table("jobs").insert(payload.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create job")
    return JobResponse(**result.data[0])


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    status: str = None,
    limit: int = 20,
    offset: int = 0,
    db: Client = Depends(get_supabase)
):
    query = db.table("jobs").select("*", count="exact").order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    query = query.range(offset, offset + limit - 1)
    result = query.execute()
    return JobListResponse(jobs=[JobResponse(**j) for j in (result.data or [])], total=result.count or 0)


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: Client = Depends(get_supabase)):
    result = db.table("jobs").select("*").eq("id", job_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse(**result.data)


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job(job_id: str, db: Client = Depends(get_supabase)):
    db.table("jobs").delete().eq("id", job_id).execute()


@router.post("/jobs/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(job_id: str, db: Client = Depends(get_supabase)):
    result = db.table("jobs").update({"status": "cancelled"}).eq("id", job_id).eq("status", "running").execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Job is not running or not found")
    return JobResponse(**result.data[0])


# ── Job Logs ──────────────────────────────────────────────────

@router.get("/jobs/{job_id}/logs", response_model=JobLogsResponse)
async def get_job_logs(job_id: str, db: Client = Depends(get_supabase)):
    result = db.table("job_logs").select("*").eq("job_id", job_id).order("created_at").execute()
    from app.schemas.schemas import JobLogResponse
    return JobLogsResponse(logs=[JobLogResponse(**l) for l in (result.data or [])])


# ── Job Places ────────────────────────────────────────────────

@router.get("/jobs/{job_id}/places", response_model=PlacesListResponse)
async def get_job_places(
    job_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Client = Depends(get_supabase)
):
    result = (
        db.table("places")
        .select("*", count="exact")
        .eq("job_id", job_id)
        .order("created_at", desc=False)
        .range(offset, offset + limit - 1)
        .execute()
    )
    from app.schemas.schemas import PlaceResponse
    return PlacesListResponse(
        places=[PlaceResponse(**p) for p in (result.data or [])],
        total=result.count or 0
    )


# ── Job Metrics ───────────────────────────────────────────────

@router.get("/jobs/{job_id}/metrics", response_model=JobMetricsResponse)
async def get_job_metrics(job_id: str, db: Client = Depends(get_supabase)):
    result = db.table("job_metrics").select("*").eq("job_id", job_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Metrics not found")
    return JobMetricsResponse(**result.data)


# ── Export XLSX ───────────────────────────────────────────────

@router.get("/jobs/{job_id}/export")
async def export_job_xlsx(job_id: str, db: Client = Depends(get_supabase)):
    # Fetch job info
    job_result = db.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job_result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job = job_result.data

    # Fetch all places (no pagination for export)
    places_result = db.table("places").select("*").eq("job_id", job_id).order("created_at").execute()
    places = places_result.data or []

    # Generate XLSX
    buffer = generate_xlsx(job, places)

    filename = f"map-miner-{job['keyword']}-{job_id[:8]}.xlsx"
    filename = filename.replace(" ", "_")

    return StreamingResponse(
        io.BytesIO(buffer),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
