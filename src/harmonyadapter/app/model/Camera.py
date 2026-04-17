from dataclasses import dataclass, field
from typing import Dict, Tuple, Optional


@dataclass
class Camera:
    name: Optional[str] = None
    coords: Dict[int, Tuple[float, float, float]] = field(default_factory=dict)
    focals: Optional[float] = None

    def __str__(self) -> str:
        return (
            f"Camera '{self.name or 'Unnamed'}'\n"
            f"  Keyframes : {len(self.coords)}\n"
            f"  Focal     : {self.focals or 'Not Set'}"
        )
