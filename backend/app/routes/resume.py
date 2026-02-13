from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import uuid, os, shutil, re
from app.auth import verify_jwt
from app.resume_parser import extract_text_from_pdf
from app.database import supabase

router = APIRouter()

def sanitize_filename(filename: str) -> str:
    # Keep only alphanumeric, dots, dashes, and underscores
    return re.sub(r'[^a-zA-Z0-9._-]', '', filename)

@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    user=Depends(verify_jwt)
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF is allowed.")

    # 1. Faster Size check & Read
    content = await file.read()
    MAX_SIZE = 25 * 1024 * 1024
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 25MB allowed.")

    clean_name = sanitize_filename(file.filename)
    unique_name = f"{uuid.uuid4()}_{clean_name}"
    
    print(f"DEBUG: Processing upload for file: {file.filename}")
    
    try:
        # 1. Bucket check/creation
        print("DEBUG: Checking/Creating bucket 'resumes'...")
        try:
            supabase.storage.get_bucket("resumes")
        except:
            try:
                supabase.storage.create_bucket("resumes", {"public": True})
                print("DEBUG: Created missing bucket 'resumes'")
            except Exception as bucket_err:
                print(f"INFO: Bucket check/create info: {bucket_err}")

        # 2. Upload to Supabase Storage
        print(f"DEBUG: Uploading {len(content)} bytes to Storage as {unique_name}...")
        supabase.storage.from_("resumes").upload(
            unique_name, 
            content,
            {"content-type": "application/pdf"}
        )
        print("DEBUG: Storage upload successful.")
        file_url = supabase.storage.from_("resumes").get_public_url(unique_name)

        # 3. Extract text
        temp_path = f"temp_{unique_name}"
        print(f"DEBUG: Writing temp file {temp_path}...")
        with open(temp_path, "wb") as f:
            f.write(content)
            
        print("DEBUG: Extracting text with pdfplumber...")
        text = extract_text_from_pdf(temp_path)
        print(f"DEBUG: Extracted {len(text)} characters.")
        
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if not text:
             raise HTTPException(status_code=422, detail="Could not extract text from PDF. It might be empty or image-based.")

        # 4. Save to Database (Check for existing to prevent duplicates)
        print(f"DEBUG: Checking if {clean_name} already exists for user...")
        existing = supabase.table("resumes").select("id").eq("user_id", user["sub"]).eq("filename", clean_name).execute()
        
        if existing.data:
            resume_id = existing.data[0]["id"]
            print(f"DEBUG: Updating existing record ID: {resume_id}")
            supabase.table("resumes").update({
                "content": text,
                "file_url": file_url,
                "created_at": "now()"
            }).eq("id", resume_id).execute()
            status_msg = "Resume updated successfully"
        else:
            insert_res = supabase.table("resumes").insert({
                "user_id": user["sub"],
                "filename": clean_name,
                "content": text,
                "file_url": file_url
            }).execute()
            
            if insert_res.data:
                resume_id = insert_res.data[0]["id"]
            else:
                # Fallback check
                existing_retry = supabase.table("resumes").select("id").eq("user_id", user["sub"]).eq("filename", clean_name).execute()
                resume_id = existing_retry.data[0]["id"] if existing_retry.data else None
                
            status_msg = "Resume uploaded and saved successfully"
        
        print("DEBUG: Database operation successful.")

        return {
            "status": status_msg,
            "id": resume_id,
            "file_url": file_url
        }

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"DEBUG: Upload Error Details:\n{error_trace}")
        
        # Specific check for bucket issues vs database issues
        error_msg = str(e)
        if "bucket_not_found" in error_msg.lower() or "not found" in error_msg.lower():
             detail = "Supabase Storage bucket 'resumes' was not found. Please create it in your dashboard."
        elif "PGRST204" in error_msg or "column" in error_msg.lower():
             detail = "Database Error: The 'resumes' table is missing the 'content' column. Please run: ALTER TABLE resumes ADD COLUMN content TEXT;"
        elif "forbidden" in error_msg.lower() or "policy" in error_msg.lower():
             # If we see UUIDs in the bucket (from user screenshot), the storage upload succeeded.
             # Therefore, the "forbidden/policy" error is likely on the DATABASE insert.
             detail = "Permission Denied: Your 'resumes' TABLE likely has RLS enabled. Please run the SQL to Allow Inserts to the resumes table."
        else:
             detail = f"Upload Failed: {error_msg}"
             
        raise HTTPException(status_code=500, detail=detail)
