import spacy
import re
from typing import List, Dict

from nltk.stem import PorterStemmer

# Load English tokenizer, tagger, parser and NER
try:
    nlp = spacy.load("en_core_web_sm")
except:
    # Fallback if model not downloaded
    nlp = None

stemmer = PorterStemmer()

SKILLS_DB = [
    "python", "javascript", "react", "node.js", "java", "c++", "sql", "mongodb",
    "aws", "azure", "docker", "kubernetes", "tensorflow", "pytorch", "nlp",
    "machine learning", "deep learning", "flask", "fastapi", "django", "typescript",
    "html", "css", "tailwind", "git", "ci/cd", "agile", "scrum", "algorithms",
    "debugging", "clean code", "stemming", "tokenization", "lemmatization"
]

def levenshtein_distance(s1: str, s2: str) -> int:
    """Implementation of Levenshtein distance for spelling correction."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def process_text(text: str) -> Dict[str, List[str]]:
    """Tokenization, Stop word removal, Lemmatization AND Stemming."""
    if not text:
        return {"tokens": [], "lemmas": [], "stems": []}
    
    text = text.lower()
    if not nlp:
        tokens = text.split()
        return {"tokens": tokens, "lemmas": tokens, "stems": [stemmer.stem(t) for t in tokens]}

    doc = nlp(text)
    # Tokenization + Stop word removal
    clean_tokens = [token for token in doc if not token.is_stop and not token.is_punct and len(token.text.strip()) > 1]
    
    return {
        "tokens": [t.text for t in clean_tokens],
        "lemmas": [t.lemma_ for t in clean_tokens],
        "stems": [stemmer.stem(t.text) for t in clean_tokens]
    }

def extract_years(experience_list: List[str]) -> int:
    """Helper to get the highest numeric year from found patterns."""
    years = []
    for exp in experience_list:
        match = re.search(r'(\d+)', exp)
        if match:
            years.append(int(match.group(1)))
    return max(years) if years else 0

def extract_entities(text: str) -> Dict[str, any]:
    if not text:
        return {"skills": [], "experience": 0, "roles": []}
    
    # 1. Full Pipeline: Tokenization, Stop word removal, Lemmatization, Stemming
    features = process_text(text)
    all_linguistic_variants = set(features["tokens"] + features["lemmas"] + features["stems"])
    
    # 2. Extract Skills with Fuzzy Matching (Levenshtein)
    found_skills = []
    for skill in SKILLS_DB:
        if skill in all_linguistic_variants:
            found_skills.append(skill)
            continue
            
        if len(skill) > 4:
            for token in features["tokens"]:
                if len(token) > 4 and levenshtein_distance(skill, token) <= 1:
                    found_skills.append(skill)
                    break
            
    # 3. Extract Experience (Numerical)
    exp_matches = re.findall(r'(\d+)\+?\s*(?:years?|yrs?)(?:\s+of\s+experience)?', text.lower())
    experience_years = extract_years(exp_matches)
    
    # 4. Extract Roles (Regex/Pattern)
    role_patterns = [r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Engineer|Developer|Scientist|Analyst|Manager|Lead|Designer)\b']
    roles = []
    for pattern in role_patterns:
        matches = re.findall(pattern, text)
        roles.extend(matches)

    return {
        "skills": list(set(found_skills)),
        "experience": experience_years,
        "roles": [r.lower() for r in list(set(roles))]
    }

def calculate_detailed_scores(job_entities: Dict, resume_entities: Dict) -> Dict[str, float]:
    """Calculates granular component scores for the weighted formula."""
    
    # 1. Skill Match (0.0 to 100.0)
    job_skills = set(job_entities.get("skills", []))
    res_skills = set(resume_entities.get("skills", []))
    skill_score = (len(job_skills.intersection(res_skills)) / len(job_skills) * 100) if job_skills else 0.0
    
    # 2. Experience Match (0.0 to 100.0)
    # If resume years >= job min years, 100%. Otherwise proportional.
    job_exp = job_entities.get("experience", 0)
    res_exp = resume_entities.get("experience", 0)
    if job_exp == 0:
        exp_score = 100.0 # No exp required
    else:
        exp_score = min(100.0, (res_exp / job_exp) * 100)
    
    # 3. Role Similarity (0.0 to 100.0)
    # Simple overlap for now, can be improved with word embeddings later
    job_roles = set(job_entities.get("roles", []))
    res_roles = set(resume_entities.get("roles", []))
    role_score = (len(job_roles.intersection(res_roles)) / len(job_roles) * 100) if job_roles else 0.0
    # Fallback: if no roles found but skills match well, give partial credit or use semantic score
    if not job_roles: role_score = 100.0

    return {
        "skill_score": round(skill_score, 2),
        "experience_score": round(exp_score, 2),
        "role_score": round(role_score, 2)
    }
