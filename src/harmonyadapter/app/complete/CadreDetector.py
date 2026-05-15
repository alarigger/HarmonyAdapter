from app.model.Cadre import Cadre,Rect,CadreFactory
from app.model.PSDDocument import PSDDocument
from app.model.BGLayer import BGLayer
from app.integrations.psdreader.PSDReaderConnector import PSDReaderConnector
import re
from psd_tools import PSDImage
from psd_tools.api.layers import Group
from typing import List
import os
import re
import dataclasses

STUDIO_CONVENTIONS= {
    "shot_patterns": [
        r"^SH\d+",
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
        psd = PSDDocument(psd_path).parse()        
        
        print(psd)

        cadres = []
        cadres += self._parse_with_layers_names(psd)
        cadres += self._parse_with_group_hierarchy(psd)
        
        print("**********************************DETECTED CADRES**********************************")
        print(cadres)

        return self._deduplicate(cadres)
    
    def _parse_with_layers_names(self,psd:PSDDocument)->list[Cadre]:
        cadres = []
        for layer in psd:
            if layer.is_group():
                continue
            shot_name = self._match_shot(layer.name)
            if not shot_name:
                continue

            cadres.append(CadreFactory().from_psd_layer(psd, shot_name, layer))
        return cadres    
    
    def _parse_with_group_hierarchy(self, psd: PSDDocument) -> List[Cadre]:
        """
        Parse cadres using PSD hierarchy instead of flat layer names.

        Expected pattern:
            .../<shot_id>/Camera
        """

        cadres = []

        for layer in psd:

            # skip groups
            if layer.type == "group":
                continue

            parts = layer.layer_path.split("/")
            
            print(parts)

            # must have at least: <shot_id>/Camera
            if len(parts) < 2:
                continue

            shot_name = parts[-2]
            leaf_name = parts[-1]

            # only accept Camera nodes
            if leaf_name.lower() != "camera":
                continue

            # optional strict validation (same style as your flat parser)
            if not self._match_short_shot(shot_name):
                continue

            cadres.append(CadreFactory().from_psd_layer(psd, shot_name, layer))

        return cadres

    
    def _match_shot(self, name: str) -> str | None:
        for regex in self._shot_regex:
            m = regex.match(name)
            if m:
                return m.group(0)  # return matched shot string
        return None    
    

    def _match_short_shot(self, name: str) -> str | None:
        """
        Match strict shot group names like:
            200, 012, 152
        """

        m = re.fullmatch(r"\d{3,4}", name)

        if m:
            return m.group(0)

        return None
    
        
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

