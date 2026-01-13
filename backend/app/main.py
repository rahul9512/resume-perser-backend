from fastapi import FastAPI
from app.routes import resume, job, match

app = FastAPI(title="Resume Parser & Screening System")
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router)
app.include_router(job.router)
app.include_router(match.router)
