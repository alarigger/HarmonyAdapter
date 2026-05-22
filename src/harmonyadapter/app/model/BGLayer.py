from dataclasses import dataclass
from psd_tools import PSDImage
from psd_tools.api.layers import Group

@dataclass
class BGLayer:
    name: str
    psd_path: str
    parent_group:str
    layer_path: str
    type: str # pixel , group , effect , mask 
    x:int
    y:int
    width:int
    heigth:int
    blending_mode:str
    
    def __str__(self)->str:
        line = f"[{self.type.upper()}] {self.name} "
        f"({self.width}x{self.heigth}) "
        f"(X:{self.x} Y:{self.y}) "
        f"({self.layer_path}) "
        f"blend={self.blending_mode}"
        
        return line
    
    def is_group(self)->bool:
        return self.type=="group"
    

# =========================================================
# FACTORY
# =========================================================

class BGLayerFactory:

    @staticmethod
    def parse_from_psdtool_layer(
        layer,
        psd_path: str,
        parent_group: str = "",
        layer_path: str = "",
    ) -> BGLayer:
        """
        Convert psd-tools layer -> BGLayer
        """

        # determine layer type
        layer_type = (
            "group"
            if isinstance(layer, Group)
            else "pixel"
        )

        return BGLayer(
            name=BGLayerFactory._clean_layer_name(layer.name),
            psd_path=psd_path,
            parent_group=parent_group,
            layer_path=BGLayerFactory._clean_layer_name(layer_path),
            type=layer_type,
            x=layer.left,
            y=layer.top,
            width=layer.width,
            heigth=layer.height,
            blending_mode=str(layer.blend_mode),
        )
        
    def _clean_layer_name( name: str) -> str:
        """
        Remove hidden/control characters from PSD layer names.
        """
        return name.replace("\x00", "").strip()