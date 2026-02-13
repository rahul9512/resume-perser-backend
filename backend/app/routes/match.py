from fastapi import APIRouter, Depends, Query
from app.auth import verify_jwt
from app.database import supabase
from app.matcher import match_resume
from typing import Optional

router = APIRouter()

@router.post("/match-resumes")
def match_resumes(job_id: str, resume_id: Optional[int] = Query(None), user=Depends(verify_jwt)):
    # 1. Fetch job details
    job_response = supabase.table("jobs").select("*").eq("job_id", job_id).execute()
    if not job_response.data:
         return {"error": "Job not found"} 
    
    job_data = job_response.data[0]

    # 2. Fetch resumes (Either one specific or all for user)
    query = supabase.table("resumes").select("*").eq("user_id", user["sub"])
    if resume_id:
        query = query.eq("id", resume_id)
    
    resumes_response = query.execute()
    
    if not resumes_response.data:
         return {"message": "No resumes found to match against."}

    resume_contents = [r["content"] for r in resumes_response.data if r.get("content")]
    
    if not resume_contents:
        return {"message": "Selected resumes have no text content."}

    # 3. Perform matching
    results = match_resume(
        job_data.get("description"),
        resume_contents,
        job_keywords=job_data.get("keywords")
    )

    # 4. Enrich results with metadata
    try:
        if results:
            for res in results:
                idx = res["resume_index"]
                res["filename"] = resumes_response.data[idx].get("filename")
                res["id"] = resumes_response.data[idx].get("id")
                res["created_at"] = resumes_response.data[idx].get("created_at")
                res["file_url"] = resumes_response.data[idx].get("file_url")

            # Save to results table if analyzing all
            if not resume_id:
                print(f"DEBUG: Saving results for job {job_id}")
                supabase.table("results").upsert({
                    "job_id": job_id,
                    "results": results,
                    "user_id": user["sub"]
                }, on_conflict="job_id,user_id").execute()
        
        return results
    except Exception as e:
        print(f"CRITICAL ERROR in match enrichment/save: {e}")
        # Return what we have or a clear error
        if results: return results
        return {"error": str(e)}


@router.get("/results/{job_id}")
def get_results(job_id: str, user=Depends(verify_jwt)):
    return supabase.table("results").select("*").eq("job_id", job_id).execute().data
