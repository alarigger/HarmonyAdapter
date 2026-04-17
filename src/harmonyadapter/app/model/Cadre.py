from dataclasses import dataclass
from typing import Optional,Union
import json

@dataclass
class Rect:
    x: int
    y: int
    width: int
    height: int


@dataclass
class Cadre:
    name: Optional[str] = None
    shot: Optional[str] = None
    path: Optional[str] = None
    frame: Optional[Rect] = None
    background: Optional[Rect] = None
    dcx:Optional[int] =None
    dcy:Optional[int] =None

    def __str__(self) -> str:
        return (
            f"Cadre '{self.name or 'Unnamed'}'\n"
            f"  Path       : {self.path or 'Not Set'}\n"
            f"  Frame      : {self.frame}\n"
            f"  Background : {self.background}"
        )



class CadreFactory:
    @staticmethod
    def from_json_path(json_path: str) -> list[Cadre]:
        """
        Reads a JSON file containing cadre definitions and returns a list of Cadre objects.
        """
        with open(json_path, "r", encoding="utf-8") as f:
            json_data = json.load(f)
        return CadreFactory.from_dict(json_data)

    @staticmethod
    def from_dict(data: Union[list[dict], dict]) -> list[Cadre]:
        """
        Parses a dict or list of dicts into Cadre objects.
        """
        if isinstance(data, dict):
            data = [data]

        cadres = []
        for item in data:
            frame = Rect(
                x=item.get("x", 0),
                y=item.get("y", 0),
                width=item.get("width", 0),
                height=item.get("height", 0)
            )

            background = Rect(
                x=0,
                y=0,
                width=item.get("psd_width", 0),
                height=item.get("psd_height", 0)
            )

            cadre = Cadre(
                name=item.get("name"),
                shot=item.get("shot"),
                path=None,
                frame=frame,
                background=background,
                dcx=item.get("dcx"),   # distance to center of background
                dcy=item.get("dcy")
            )
            cadres.append(cadre)

        return cadres