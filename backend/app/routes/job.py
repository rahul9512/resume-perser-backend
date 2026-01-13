from fastapi import APIRouter, Depends
from app.auth import verify_jwt
from app.schemas import JobSchema
from app.database import supabase

router = APIRouter()

@router.post("/parse-job")
def parse_job(job: JobSchema, user=Depends(verify_jwt)):
    supabase.table("jobs").insert({
        "job_id": job.job_id,
        "user_id": user["sub"],
        "description": job.description,
        "keywords": job.keywords,
        "min_experience": job.min_experience
    }).execute()

    return {"status": "Job saved"}
