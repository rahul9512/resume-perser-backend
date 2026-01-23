from fastapi import APIRouter, Depends
from app.auth import verify_jwt
from app.database import supabase
from app.matcher import match_resume

router = APIRouter()

@router.post("/match-resumes")
def match_resumes(job_id: str, user=Depends(verify_jwt)):
    # Fetch job details
    job_response = supabase.table("jobs").select("*").eq("job_id", job_id).execute()
    if not job_response.data:
         return {"error": "Job not found"} 
    
    job_data = job_response.data[0]

    # Fetch user's resumes
    resumes_response = supabase.table("resumes").select("*").eq("user_id", user["sub"]).execute()
    
    if not resumes_response.data:
         return {"message": "No resumes found to match against."}

    resume_contents = [r["content"] for r in resumes_response.data if r.get("content")]

    results = match_resume(
        job_data.get("description"),
        resume_contents,
        job_keywords=job_data.get("keywords")
    )

    # Only insert if we have results
    if results:
        # Add metadata like filename back to results for the UI
        for res in results:
            idx = res["resume_index"]
            res["filename"] = resumes_response.data[idx].get("filename")

        supabase.table("results").insert({
            "job_id": job_id,
            "results": results,
            "user_id": user["sub"]
        }).execute()

    return results


@router.get("/results/{job_id}")
def get_results(job_id: str, user=Depends(verify_jwt)):
    return supabase.table("results").select("*").eq("job_id", job_id).execute().data
