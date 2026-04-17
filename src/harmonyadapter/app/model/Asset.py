from .Cadre import Cadre
from dataclasses import dataclass,field
from typing import Optional, Tuple, List
from pathlib import Path


@dataclass(frozen=True)
class Asset:
    name:Optional[str] = None
    path: Optional[str] = None

