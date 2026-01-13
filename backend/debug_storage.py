from app.database import supabase
import uuid

def test_upload():
    print("DEBUG: Starting Storage Test...")
    unique_name = f"debug_{uuid.uuid4()}.txt"
    try:
        # 1. List Buckets
        print("DEBUG: Listing Buckets...")
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        print(f"DEBUG: Found Buckets: {bucket_names}")
        
        if "resumes" not in bucket_names:
            print("ERROR: 'resumes' bucket DOES NOT EXIST.")
            # Try creating
            try:
                print("DEBUG: Attempting to create 'resumes' bucket...")
                supabase.storage.create_bucket("resumes", {"public": True})
                print("DEBUG: Created 'resumes' bucket.")
            except Exception as e:
                print(f"ERROR: Failed to create bucket: {e}")
                return

        # 2. Try Upload
        print(f"DEBUG: Attempting upload to 'resumes' as {unique_name}...")
        res = supabase.storage.from_("resumes").upload(
            unique_name,
            b"Hello World Debug Content",
            {"content-type": "text/plain"}
        )
        print(f"DEBUG: Upload Result: {res}")
        print("SUCCESS: Upload working correctly!")
        
    except Exception as e:
        print(f"\nFATAL ERROR: {str(e)}")
        if "policy" in str(e).lower() or "security" in str(e).lower():
            print("\nDIAGNOSIS: RLS Policies are BLOCKING the upload.")
        elif "bucket" in str(e).lower():
            print("\nDIAGNOSIS: Bucket configuration issue.")

if __name__ == "__main__":
    test_upload()
