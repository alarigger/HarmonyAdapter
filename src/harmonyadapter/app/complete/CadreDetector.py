from ..model.Cadre import Cadre,CadreFactory
from ..model.PSDDocument import PSDDocument
import re
from typing import List


STUDIO_CONVENTIONS= {
    "shot_patterns": [
        r"^SH\d+",
        r"^SH\d+",
        r"^SHOT_\d+",
        r".*_SH\d+",
        r"^SQ\d+_SH\d+"
    ]
}

EXPORT_WIDTH = 1920# HD 
EXPORT_HEIGTH= 1080 # HD 
EXPORT_RATIO = EXPORT_WIDTH/EXPORT_HEIGTH # HD 




class CadreDetector():
    
    def __init__(self):
        self._shot_regex = [
            re.compile(p, re.IGNORECASE)
            for p in STUDIO_CONVENTIONS["shot_patterns"]
        ]
        self._repair = CadreRepairPipeline()
    
    def parse_cadres(self, psd_path: str) -> list[Cadre]:
        psd = PSDDocument(psd_path).parse()        
        cadres = []
        cadres += self._parse_with_layers_names(psd)
        cadres += self._parse_with_group_hierarchy(psd)
        
        cadres = self._deduplicate(cadres)
        processed_cadres= []
        for cadre in cadres:
            final_cadre = self.process_cadre(psd,cadre)
            processed_cadres.push(final_cadre)
            
        return processed_cadres 
            
    def process_cadre(self,psd:PSDDocument, cadre:Cadre):

        try:
            self.validate_cadre(psd, cadre)
        except CadreValidationError as e:
            cadre = self._repair.repair(psd,cadre,e)
            # validate again after repair
            self.validate_cadre(psd, cadre)
        return cadre    
        

    
    def validate_cadre(self, psd:PSDDocument,cadre: Cadre):

        ratio = cadre.width / cadre.height

        if abs(ratio - EXPORT_RATIO) > 0.01:
            raise CadreRatioError(
                detected_ratio=ratio,
                expected_ratio=EXPORT_RATIO,
                cadre=cadre
            )

        if cadre.x < 0 or cadre.y < 0:
            raise CadreOutOfBoundError()

        if cadre.width < EXPORT_WIDTH:
            raise CadreInsecureSizeError()
            

    
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
    
    
class CadreValidationError(Exception):
    pass

class CadreRatioError(CadreValidationError):
    '''
        the cadre do not match the default ratio 
        either the cadre is rotated and the bounding box do not match 
        either the bounding box is stretched by a misplaced pixel outside the cadre rectangle image 
    '''
    def __init__(
        self,
        detected_ratio: float,
        expected_ratio: float,
        cadre=None
    ):
        self.detected_ratio = detected_ratio
        self.expected_ratio = expected_ratio

        super().__init__(
            f"Expected {expected_ratio}, got {detected_ratio}"
        )

class CadreOutOfBoundError(CadreValidationError):
    '''
        the cadre is covering pixels outside the background bounds 
    '''
    pass

class CadreInsecureSizeError(CadreValidationError):
    '''
        the cadre size is smaller than the project export size , zooming in beyond the project pixel definition 
    '''
    pass

    
class CadreRepairPipeline:

    def __init__(self):

        self._repair_map = {
            CadreRatioError: self.fix_ratio,
            CadreOutOfBoundError: self.fix_bounds,
            CadreInsecureSizeError: self.fix_size,
        }

    def repair(self, psd:PSDDocument,cadre:Cadre, error:CadreValidationError):

        repair_fn = self._repair_map.get(type(error))

        if not repair_fn:
            raise error

        return repair_fn(cadre, error)
    
    def fix_ratio(self, psd:PSDDocument,cadre:Cadre, error:CadreValidationError):

        # try rotating first
        rotated_ratio = cadre.height / cadre.width

        if abs(rotated_ratio - EXPORT_RATIO) < 0.01:
            cadre.rotate_90()
            return cadre

        # maybe trim stray pixels
        cadre.trim_transparent_edges()

        return cadre
        
