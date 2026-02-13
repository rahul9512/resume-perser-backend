from fastapi import APIRouter, Depends, HTTPException
from app.auth import verify_jwt
from app.database import supabase

router = APIRouter()

@router.delete("/resume/{resume_id}")
async def delete_resume(resume_id: str, user=Depends(verify_jwt)):
    # 1. Fetch resume to get the storage path
    resume_res = supabase.table("resumes").select("*").eq("id", resume_id).eq("user_id", user["sub"]).execute()
    
    if not resume_res.data:
        raise HTTPException(status_code=404, detail="Resume not found or unauthorized")
    
    resume_data = resume_res.data[0]
    file_url = resume_data.get("file_url")
    
    try:
        # 2. Delete from storage
        if file_url and "resumes/" in file_url:
            storage_path = file_url.split("resumes/")[-1]
            supabase.storage.from_("resumes").remove([storage_path])
        
        # 3. Delete from database
        supabase.table("resumes").delete().eq("id", resume_id).execute()
        
        return {"status": "success", "message": "Deleted successfully"}
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
