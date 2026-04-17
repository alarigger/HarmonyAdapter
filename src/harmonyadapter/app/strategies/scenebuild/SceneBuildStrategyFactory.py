from app.model.Software import Software
from app.strategies.scenebuild.SceneBuildStrategy import SceneBuildStrategy
from app.strategies.scenebuild.HarmonySceneBuildStrategy import HarmonySceneBuildStrategy
from app.strategies.scenebuild.NullSceneBuildStrategy import NullSceneBuildStrategy

class SceneBuildStrategyFactory:

    _strategies = {
        Software.BLENDER: NullSceneBuildStrategy(),
        Software.HARMONY: HarmonySceneBuildStrategy(),
        Software.UNKNOWN: NullSceneBuildStrategy()
    }

    @classmethod
    def get_strategy(cls, software: Software) -> SceneBuildStrategy:
        return cls._strategies[software]
    

    
    
    
