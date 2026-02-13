from app.database import supabase
from collections import Counter

def prune_duplicates():
    print("🚀 Starting Database Pruning...")
    
    # 1. Fetch all resumes
    res = supabase.table("resumes").select("id, filename, user_id, created_at").execute()
    all_resumes = res.data or []
    print(f"DEBUG: Found {len(all_resumes)} total resumes.")

    # 2. Group by (user_id, filename_normalized)
    groups = {}
    for r in all_resumes:
        fname = r.get("filename")
        if not fname: continue
        
        key = (r["user_id"], fname.strip().lower())
        if key not in groups:
            groups[key] = []
        groups[key].append(r)

    to_delete = []
    for key, resumes in groups.items():
        if len(resumes) > 1:
            # Sort by ID descending (assuming higher ID is newer)
            resumes.sort(key=lambda x: x["id"], reverse=True)
            # Keep the first one, delete the rest
            kept = resumes[0]
            redundant = resumes[1:]
            print(f"INFO: Keep ID {kept['id']} for '{key[1]}'. Pruning {len(redundant)} duplicates.")
            for r in redundant:
                to_delete.append(r["id"])

    # 3. Perform Deletion
    if not to_delete:
        print("✅ No duplicates found. Database is clean.")
        return

    print(f"⚠️ Proceeding to delete {len(to_delete)} duplicate records...")
    for rid in to_delete:
        try:
            supabase.table("resumes").delete().eq("id", rid).execute()
            print(f"  - Deleted ID {rid}")
        except Exception as e:
            print(f"  - ❌ Failed to delete ID {rid}: {e}")

    print(f"✨ PRUNING COMPLETE. Deleted {len(to_delete)} records.")

if __name__ == "__main__":
    prune_duplicates()
