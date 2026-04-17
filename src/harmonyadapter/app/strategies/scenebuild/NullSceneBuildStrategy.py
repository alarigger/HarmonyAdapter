
import subprocess
from app.strategies.scenebuild.SceneBuildStrategy import SceneBuildStrategy
from app.HarmonyAdapterRequest import HarmonyAdapterRequest

class NullSceneBuildStrategy(SceneBuildStrategy):

    def build_scene(self, request: HarmonyAdapterRequest) -> str:
        """Generate preview and return preview file path"""
        pass