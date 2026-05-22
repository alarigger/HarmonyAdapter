from dataclasses import dataclass, asdict, field
from typing import List, Optional

from psd_tools import PSDImage
from psd_tools.api.layers import Group

from .BGLayer import BGLayer,BGLayerFactory


# =========================================================
# DATA
# =========================================================

@dataclass
class BGLayer:
    name: str
    psd_path: str
    parent_group: str
    layer_path: str
    type: str  # pixel, group, effect, mask
    x: int
    y: int
    width: int
    heigth: int
    blending_mode: str





# =========================================================
# PSD DOCUMENT
# =========================================================

@dataclass
class PSDDocument:
    psd_path: str
    layers: List[BGLayer] = field(default_factory=list)
    width: int = 0
    height: int = 0

    def parse(self, psd_path: str = None):

        path = psd_path or self.psd_path
        psd = PSDImage.open(path)

        self.psd_path = path

        # 👇 EXPOSE CANVAS SIZE
        self.width = psd.width
        self.height = psd.height

        self.layers.clear()
        self._walk_layers(psd)

        return self
    
    def _walk_layers(self,layers, parent_group="", current_path=""):
        for layer in layers:

            # build hierarchy path
            layer_path = (
                f"{current_path}/{layer.name}"
                if current_path
                else layer.name
            )

            # use factory
            bg_layer = (
                BGLayerFactory.parse_from_psdtool_layer(
                    layer=layer,
                    psd_path=self.psd_path,
                    parent_group=parent_group,
                    layer_path=layer_path,
                )
            )

            self.layers.append(bg_layer)

            # recurse into groups
            if isinstance(layer, Group):
                self._walk_layers(
                    layer,
                    parent_group=layer.name,
                    current_path=layer_path,
                )        

    # -----------------------------------------------------

    def get_layers_by_name(
        self,
        name: str
    ) -> List[BGLayer]:

        return [
            layer
            for layer in self.layers
            if layer.name == name
        ]

    # -----------------------------------------------------

    def get_layer_by_path(
        self,
        path: str
    ) -> Optional[BGLayer]:

        for layer in self.layers:
            if layer.layer_path == path:
                return layer

        return None

    # -----------------------------------------------------

    def to_dict(self):

        return [
            asdict(layer)
            for layer in self.layers
        ]
        
    def __str__(self) -> str:
        """
        Returns a tree-like string representation using BGLayer objects.
        """

        lines = []

        # build quick lookup tree structure from layer_path
        children_map = {}

        for layer in self.layers:
            parent = layer.parent_group or ""
            children_map.setdefault(parent, []).append(layer)

        def walk(parent: str, indent: int = 0):
            for layer in children_map.get(parent, []):

                prefix = "  " * indent

                lines.append(prefix+" "+str(layer))


                # recurse into groups
                if layer.type == "group":
                    walk(layer.name, indent + 1)

        walk("")
        return "\n".join(lines)
    
    def __iter__(self):
        """
        Iterate over all BGLayers in the document (flat iteration).
        """
        return iter(self.layers)


# =========================================================
# EXAMPLE
# =========================================================


'''
doc = PSDDocument("example.psd")

doc.parse()

print("\nTOTAL:", len(doc.layers))

hero = doc.get_layer_by_path(
    "Characters/Hero"
)

print("\nFOUND:")
print(hero)
'''