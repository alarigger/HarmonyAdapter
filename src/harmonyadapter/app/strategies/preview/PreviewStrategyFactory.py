from app.model.Software import Software
from app.strategies.preview.PreviewStrategy import PreviewStrategy
from app.strategies.preview.HarmonyPreviewStrategy import HarmonyPreviewStrategy
from app.strategies.preview.BlenderPreviewStrategy import BlenderPreviewStrategy
from app.strategies.preview.NullPreviewStrategy import NullPreviewStrategy

class PreviewStrategyFactory:

    _strategies = {
        Software.BLENDER: BlenderPreviewStrategy(),
        Software.HARMONY: HarmonyPreviewStrategy(),
        Software.UNKNOWN: NullPreviewStrategy()
    }

    @classmethod
    def get_strategy(cls, software: Software) -> PreviewStrategy:
        return cls._strategies[software]
    

    
    
    
