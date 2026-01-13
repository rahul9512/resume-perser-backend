import os
from dotenv import load_dotenv

# Load from specific path
load_dotenv(".env")

from app.database import supabase
from app.config import SUPABASE_URL

print(f"Connecting to: {SUPABASE_URL}")
# ... rest of the script logic

try:
    # 1. Test Storage
    try:
        buckets = supabase.storage.list_buckets()
        print(f"Buckets found: {[b.name for b in buckets]}")
        resumes_bucket = next((b for b in buckets if b.name == 'resumes'), None)
        if resumes_bucket:
            print("SUCCESS: 'resumes' bucket exists.")
        else:
            print("ERROR: 'resumes' bucket MISSING.")
    except Exception as e:
        print(f"ERROR testing Storage: {e}")

    # 2. Test Table
    try:
        res = supabase.table("resumes").select("*").limit(1).execute()
        print("SUCCESS: Connected to 'resumes' table.")
        if res.data:
            print(f"Sample data keys: {res.data[0].keys()}")
            if 'file_url' in res.data[0]:
                print("SUCCESS: 'file_url' column exists.")
            else:
                print("WARNING: 'file_url' column MISSING in 'resumes' table.")
    except Exception as e:
        print(f"ERROR testing Table: {e}")

except Exception as e:
    print(f"FATAL ERROR: {e}")
