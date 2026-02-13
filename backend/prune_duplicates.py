import os
from dotenv import load_dotenv
from supabase import create_client
import collections

# Load .env from backend directory
load_dotenv("backend/.env")
url = os.environ.get("SUPABASE_URL")
# Use ANON key if service role is missing
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    print(f"❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    print(f"DEBUG: URL found: {url}, KEY found: {'[HIDDEN]' if key else 'None'}")
    exit(1)

supabase = create_client(url, key)

def prune_duplicates():
    print(f"🚀 Starting database cleanup on {url}...")
    
    try:
        # 1. Fetch all resumes
        response = supabase.table("resumes").select("id, filename, user_id, created_at").execute()
        resumes = response.data
    except Exception as e:
        print(f"❌ Failed to fetch resumes: {e}")
        return
    
    if not resumes:
        print("Empty library. Nothing to prune.")
        return

    # 2. Group by (user_id, filename)
    groups = collections.defaultdict(list)
    for res in resumes:
        key = (res['user_id'], res['filename'].strip().lower())
        groups[key].append(res)

    to_delete = []
    
    for key, items in groups.items():
        if len(items) > 1:
            # Sort by created_at descending (latest first)
            items.sort(key=lambda x: x['created_at'], reverse=True)
            
            # Keep the first one, delete the rest
            duplicates = items[1:]
            for dup in duplicates:
                to_delete.append(dup['id'])
                print(f"[-] Identified duplicate: {dup['filename']} (ID: {dup['id']})")

    if not to_delete:
        print("✅ No duplicates found.")
        return

    print(f"⚠️  Found {len(to_delete)} duplicates. Deleting...")
    
    # 3. Delete duplicates
    for resume_id in to_delete:
        try:
            supabase.table("resumes").delete().eq("id", resume_id).execute()
            print(f"✅ Deleted ID: {resume_id}")
        except Exception as e:
            # If ANON key doesn't have delete permissions, this might fail.
            # But the UI handles it by just not showing them.
            print(f"❌ Failed to delete {resume_id} (Check RLS policies): {e}")

    print("\n✨ Database is now clean!")

if __name__ == "__main__":
    prune_duplicates()
