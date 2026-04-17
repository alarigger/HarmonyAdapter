from .Cadre import Cadre
from .Asset import Asset
from dataclasses import dataclass,field
from typing import Optional, Tuple, List
from pathlib import Path


@dataclass(frozen=True)
class Casting:
    name:str = None
    casting:Optional[Asset] = None