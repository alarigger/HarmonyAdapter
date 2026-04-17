from dataclasses import dataclass, field
from typing import Optional, Dict, Any


@dataclass
class Render:
    output_path: Optional[str] = None
    output_type: Optional[str] = None
    video_path: Optional[str] = None
    image_folder: Optional[str] = None
    options: Dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:
        return (
            f"Render\n"
            f"  Output Path : {self.output_path or 'Not Set'}\n"
            f"  Output Type : {self.output_type or 'Not Set'}\n"
            f"  Video Path  : {self.video_path or 'Not Set'}\n"
            f"  Image Folder: {self.image_folder or 'Not Set'}\n"
            f"  Options     : {len(self.options)} entries"
        )
