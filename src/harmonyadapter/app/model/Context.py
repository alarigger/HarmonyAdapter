from dataclasses import dataclass,field
from typing import Optional, Tuple, List

@dataclass(frozen=True)
class Context:
    project: Optional[str] = None
    task_name: Optional[str] = None
    task_id: Optional[int] = None
    season: Optional[str] = None
    episode: Optional[str] = None
    sequence: Optional[str] = None
    shot: Optional[str] = None
    cut_duration: Optional[int] = None
 
