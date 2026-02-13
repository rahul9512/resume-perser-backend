from app.database import supabase

def debug_tables():
    print("--- Resumes by User ---")
    res = supabase.table("resumes").select("user_id, filename").execute()
    user_counts = {}
    for row in res.data:
        uid = row['user_id']
        fname = row['filename']
        if uid not in user_counts: user_counts[uid] = []
        user_counts[uid].append(fname)
    
    for uid, files in user_counts.items():
        print(f"\nUser: {uid}")
        print(f"Total: {len(files)}")
        unique_fnames = set(files)
        print(f"Unique filenames: {len(unique_fnames)}")
        from collections import Counter
        counts = Counter(files)
        for fname, count in counts.items():
            if count > 1:
                print(f"  - {count}x {fname}")

if __name__ == "__main__":
    debug_tables()
