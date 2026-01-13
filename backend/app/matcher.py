from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from app.nlp_engine import extract_entities, calculate_detailed_scores

def match_resume(job_text, resume_texts, job_keywords=None):
    if not (job_text or job_keywords) or not resume_texts:
        return []

    target_text = job_text if job_text else " ".join(job_keywords)
    
    try:
        # 0. Global Model Setup (TF-IDF still used for semantic fallback)
        vectorizer = TfidfVectorizer(stop_words="english")
        all_docs = [target_text] + resume_texts
        vectors = vectorizer.fit_transform(all_docs)
        job_vector = vectors[0:1]
        resume_vectors = vectors[1:]
        semantic_scores = cosine_similarity(job_vector, resume_vectors)[0]

        # 1. Extract and Prep Job Entities
        job_entities = extract_entities(target_text)
        print(f"DEBUG: Job Entities: {job_entities}")
        
        results = []
        for i, resume_text in enumerate(resume_texts):
            # 2. Extract Resume Entities
            res_entities = extract_entities(resume_text)
            
            # 3. Calculate Component Scores
            scores = calculate_detailed_scores(job_entities, res_entities)
            
            # 4. Final Weighted Formula
            # Final Score = (Skill Match * 0.6) + (Experience Match * 0.25) + (Role Similarity * 0.15)
            final_score = (
                (scores["skill_score"] * 0.60) + 
                (scores["experience_score"] * 0.25) + 
                (scores["role_score"] * 0.15)
            )
            final_score = round(final_score, 2)
            
            # Fallback: if final_score is very low (e.g. 0), but semantic score is high, 
            # maybe the skills weren't in our DB. We show semantic in details.
            semantic_pc = round(semantic_scores[i] * 100, 2)

            print(f"DEBUG: Resume {i} - Final Score: {final_score}% (Skills: {scores['skill_score']}, Exp: {scores['experience_score']}, Role: {scores['role_score']})")

            # Eligibility based on 75% bar (as per previous request)
            eligibility = "Eligible" if final_score >= 75 else "Not Eligible"
            
            results.append({
                "resume_index": i,
                "match_score": final_score,
                "eligibility": eligibility,
                "details": {
                    "skill_match": scores["skill_score"],
                    "experience_match": scores["experience_score"],
                    "role_similarity": scores["role_score"],
                    "semantic_score": semantic_pc,
                    "matched_skills": list(set(job_entities["skills"]).intersection(set(res_entities["skills"]))),
                    "years_of_experience": res_entities["experience"]
                }
            })
            
        return sorted(results, key=lambda x: x["match_score"], reverse=True)
        
    except Exception as e:
        import traceback
        print(f"Error in matching: {e}\n{traceback.format_exc()}")
        return []
