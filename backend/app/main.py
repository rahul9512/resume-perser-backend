import os
from fastapi import FastAPI
from app.routes import resume, job, match

app = FastAPI(title="Resume Parser & Screening System")
from fastapi.middleware.cors import CORSMiddleware

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(resume.router)
app.include_router(job.router)
app.include_router(match.router)
