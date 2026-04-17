from .Cadre import Cadre
from dataclasses import dataclass,field
from typing import Optional, Tuple, List
from pathlib import Path


@dataclass(frozen=True)
class BG:
    name:Optional[str] = None
    path: Optional[str] = None
    cadres: List[Cadre] = field(default_factory=list)
    height: Optional[int] = None
    width: Optional[int] = None

    def __str__(self) -> str:
        return (
            f"BG\n"
            f"  Name   : {self.name or 'Not Set'}\n"
            f"  Path   : {self.path or 'Not Set'}\n"
            f"  Size   : {self.width}x{self.height}\n"
            f"  Cadres : {len(self.cadres)} items"
        )
        
    def add_cadre(self, cadre: Cadre) -> None:
        self.cadres.append(cadre)
        
    @property
    def size(self):
        return (self.width, self.height)

    def __post_init__(self):
        if self.width is not None and self.width < 0:
            raise ValueError("Width cannot be negative")
        if self.height is not None and self.height < 0:
            raise ValueError("Height cannot be negative")
        
class BGFactory:
    @staticmethod
    def create(
        name: Optional[str] = None,
        path: Optional[str] = None,
        cadres: Optional[List[Cadre]] = None,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> BG:
        """
        Factory for BG.
        - If name is None but path is given, extract name from filename (without extension)
        - Converts cadres to immutable tuple
        """
        if path is None and name is None:
            raise ValueError("Either 'name' or 'path' must be provided")

        # If name is missing, extract from path
        final_name = name or Path(path).stem
        final_path = path or final_name
        final_cadres = tuple(cadres) if cadres else ()

        return BG(
            name=final_name,
            path=final_path,
            cadres=final_cadres,
            width=width,
            height=height,
        )