from dataclasses import dataclass, field
from typing import Optional, Dict, Any


@dataclass
class Build:
    output_path: Optional[str] = None
    output_folder: Optional[str] = None
    json: Optional[str] = None
    options: Dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:
        return (
            f"Build\n"
            f"  Output Path : {self.output_path or 'Not Set'}\n"
            f"  Options     : {len(self.options)} entries"
        )
