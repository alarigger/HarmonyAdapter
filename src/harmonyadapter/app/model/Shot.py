from dataclasses import dataclass
from typing import Optional
from .Camera import Camera
from .Episode import Episode

@dataclass
class Shot:
    name:str = None
    episode:Optional[Episode] = None
    path: Optional[str] = None
    camera: Optional[Camera] = None

    def set_camera(self, camera: Camera) -> None:
        self.camera = camera

    def __str__(self) -> str:
        return (
            f"Shot\n"
            f"  Path   : {self.path or 'No Path'}\n"
            f"  Camera : {self.camera or 'No Camera'}"
        )