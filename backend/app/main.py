import os
from fastapi import FastAPI
from app.routes import resume, job, match, delete

app = FastAPI(title="Resume Parser & Screening System")
from fastapi.middleware.cors import CORSMiddleware

# Robust CORS configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

env_origin = os.getenv("FRONTEND_URL")
if env_origin:
    # Remove trailing slash if present to match origin format
    origins.append(env_origin.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router)
app.include_router(job.router)
app.include_router(match.router)
app.include_router(delete.router)
