from fastapi import APIRouter, Depends, Query, Body
from app.auth import verify_jwt
from app.database import supabase
from app.matcher import match_resume
from typing import Optional, List

router = APIRouter()

@router.post("/match-resumes")
def match_resumes(
    job_id: Optional[str] = Query(None), 
    resume_id: Optional[str] = Query(None), 
    body: Optional[dict] = Body(None),
    user=Depends(verify_jwt)
):
    # 1. Resolve Parameters (Support both old Query and new Body styles)
    actual_job_id = job_id or (body.get("job_id") if body else None)
    actual_resume_id = resume_id or (body.get("resume_id") if body else None)

    print(f"DEBUG: Starting match request - Job: {actual_job_id}, Resume: {actual_resume_id}")
    
    if not actual_job_id:
        return {"error": "Missing field: job_id (Check both query and body)"}

    # 2. Fetch job details
    job_response = supabase.table("jobs").select("*").eq("job_id", actual_job_id).execute()
    if not job_response.data:
         print(f"WARNING: Job {actual_job_id} not found.")
         return {"error": f"Job {actual_job_id} not found"} 
    
    job_data = job_response.data[0]
    print(f"DEBUG: Found job: {job_data.get('job_id')}")

    # 2. Fetch resumes (Either one specific or all for user)
    query = supabase.table("resumes").select("*").eq("user_id", user["sub"])
    if actual_resume_id:
        query = query.eq("id", actual_resume_id)
    
    resumes_response = query.execute()
    raw_resumes = resumes_response.data or []

    # 3. Deduplicate by filename (keep latest)
    # If a specific resume_id is requested, we don't deduplicate the list
    if not resume_id:
        dedup_map = {}
        for r in raw_resumes:
            orig_fname = r.get("filename")
            if not orig_fname: continue
            
            # Use a normalized key for comparison
            fname_key = orig_fname.strip().lower()
            
            # If we haven't seen this filename key or this version is newer (by id)
            if fname_key not in dedup_map or r["id"] > dedup_map[fname_key]["id"]:
                dedup_map[fname_key] = r
        
        filtered_resumes = list(dedup_map.values())
        print(f"DEBUG: Deduplicated {len(raw_resumes)} resumes down to {len(filtered_resumes)} (Unique: {list(dedup_map.keys())})")
    else:
        filtered_resumes = raw_resumes
    
    if not filtered_resumes:
         print(f"WARNING: No resumes found for user {user['sub']}")
         return {"message": "No resumes found to match against."}

    resume_contents = [r["content"] for r in filtered_resumes if r.get("content")]
    print(f"DEBUG: Found {len(resume_contents)} resumes with content out of {len(filtered_resumes)}")
    
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
                res["filename"] = filtered_resumes[idx].get("filename")
                res["id"] = filtered_resumes[idx].get("id")
                res["created_at"] = filtered_resumes[idx].get("created_at")
                res["file_url"] = filtered_resumes[idx].get("file_url")

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
