from pydantic import BaseModel
from typing import List, Optional

class JobSchema(BaseModel):
    job_id: str
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    min_experience: Optional[int] = 0
