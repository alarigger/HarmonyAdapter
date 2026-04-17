from app.model.Software import Software
from app.strategies.PreviewStrategy import PreviewStrategy
from app.strategies.HarmonyPreviewStrategy import HarmonyPreviewStrategy
from app.strategies.BlenderPreviewStrategy import BlenderPreviewStrategy
from app.strategies.NullPreviewStrategy import NullPreviewStrategy

class PreviewStrategyFactory:

    _strategies = {
        Software.BLENDER: BlenderPreviewStrategy(),
        Software.HARMONY: HarmonyPreviewStrategy(),
        Software.UNKNOWN: NullPreviewStrategy()
    }

    @classmethod
    def get_strategy(cls, software: Software) -> PreviewStrategy:
        return cls._strategies[software]
    

    
    
    
