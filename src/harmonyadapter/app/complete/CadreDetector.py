from app.model.Cadre import Cadre,Rect
from app.integrations.psdreader.PSDReaderConnector import PSDReaderConnector
import re
from psd_tools import PSDImage
from typing import List
import os
import re

STUDIO_CONVENTIONS= {
    "shot_patterns": [
        r"^SH\d+",
        r"^SHOT_\d+",
        r".*_SH\d+",
        r"^SQ\d+_SH\d+"
    ]
}

class CadreDetector():
    
    def __init__(self):
        self._shot_regex = [
            re.compile(p, re.IGNORECASE)
            for p in STUDIO_CONVENTIONS["shot_patterns"]
        ]
    
    def parse_cadres(self, psd_path: str) -> list[Cadre]:
        psd = PSDImage.open(psd_path)

        cadres = []

        # run both strategies
        cadres += self._parse_group_camera(psd, psd_path)
        #cadres += self._parse_flat_shot_layer(psd, psd_path)

        return self._deduplicate(cadres)

    
    def _match_shot(self, name: str) -> str | None:
        for regex in self._shot_regex:
            m = regex.match(name)
            if m:
                return m.group(0)  # return matched shot string
        return None
    
    def _parse_group_camera(self, psd, psd_path):
        cadres = []

        for layer in self._walk_layers(psd):
            if not layer.is_group():
                continue

            shot_name = self._match_shot(layer.name)
            if not shot_name:
                continue

            camera_layer = self._find_camera_layer(layer)

            if not camera_layer:
                continue

            cadres.append(
                self._build_cadre(psd_path, shot_name, camera_layer)
            )

        return cadres
    
    def _parse_flat_shot_layer(self, psd, psd_path):

        cadres = []

        for layer in self._walk_layers(psd):
            if layer.is_group():
                continue
            
            shot_name = self._match_shot(layer.name)
            if not shot_name:
                continue

            # 👉 layer itself defines the camera frame
            cadres.append(
                self._build_cadre(psd_path, shot_name, layer)
            )

        return cadres
    
    def _walk_layers(self, layer):
        yield layer
        if hasattr(layer, "layers"):
            for child in layer.layers:
                for sub in self._walk_layers(child):
                    yield sub    
                    
    def _find_camera_layer(self, group):
        for layer in group.layers:
            if layer.name.lower() == "camera":
                return layer
        return None
    
    def _build_cadre(self, psd_path, shot_name, layer) -> Cadre:
        bbox = layer.bbox

        frame = Rect(
            x=bbox.x1,
            y=bbox.y1,
            width=bbox.width,
            height=bbox.height
        )

        return Cadre(
            name=f"{shot_name}_camera",
            shot=shot_name,
            path=psd_path,
            frame=frame,
            dcx=frame.width // 2,
            dcy=frame.height // 2
        )
        
    def _deduplicate(self, cadres:list[Cadre])->list[Cadre]:
        seen = set()
        result = []

        for c in cadres:
            key = (c.shot, c.frame.x, c.frame.y)

            if key in seen:
                continue

            seen.add(key)
            result.append(c)

        return result
            
    def psdreader(self,psd_path)->list[Cadre]:
        # use pipeline module psdreader 
        return PSDReaderConnector().parse_cadres(psd_path)
        ...

