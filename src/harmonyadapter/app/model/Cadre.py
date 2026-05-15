from dataclasses import dataclass
from typing import Optional,Union
from .PSDDocument import PSDDocument
from .BGLayer import BGLayer
from .Shot import ShotNormalizer
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
    
    _shot_normaliser = ShotNormalizer()
    
    
    
    
    @staticmethod
    def normalise_shot(name: str) -> str:    
        return CadreFactory._shot_normaliser.normalize(name)
    
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
            
        _shot_name = CadreFactory.normalise_shot(item.get("shot") or item.get("name"))

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
                shot=_shot_name,
                path=None,
                frame=frame,
                background=background,
                dcx=item.get("dcx"),   # distance to center of background
                dcy=item.get("dcy")
            )
            cadres.append(cadre)

        return cadres
    
    @staticmethod
    def ofuscate_path(path: str) -> str:
        """
        Obfuscate a path while keeping the last 3 segments visible.

        Example:
            a/b/c/d/e/f.png → .../d/e/f.png
        """

        if not path:
            return path

        parts = path.replace("\\", "/").split("/")

        if len(parts) <= 3:
            return "/".join(parts)

        return "__/" + "/".join(parts[-2:])        
        
    @staticmethod
    def from_psd_layer(psd: PSDDocument, shot_name:str, layer: BGLayer) -> Cadre:
        """
        Build a Cadre object from a BGLayer, including PSD background frame.
        """

        frame = Rect(
            x=layer.x,
            y=layer.y,
            width=layer.width,
            height=layer.heigth
        )

        # background = full PSD canvas
        background = Rect(
            x=0,
            y=0,
            width=psd.width,
            height=psd.height
        )
        
        _shot_name = CadreFactory.normalise_shot(shot_name)

        return Cadre(
            name=f"{_shot_name}_camera",
            shot=_shot_name,
            path=CadreFactory.ofuscate_path(psd.psd_path),   
            frame=frame,
            background=background,
            dcx=background.width // 2,
            dcy=background.height // 2
        )
        
        
    @staticmethod
    def set_shot_name_normalising_method(method_name:str) -> str:
        CadreFactory.shot_normalizing_method = method_name
        
    @staticmethod
    def _normalise_shot_name(shot_name:str) -> str:
        methods = {
            "english_standard":CadreFactory._norm
        }
        # 012 --> SH023
        
    @staticmethod
    def _normalise_shot_name(shot_name:str) -> str:
        methods = {
            "english_standard":_
        }
        # 012 --> SH023
        