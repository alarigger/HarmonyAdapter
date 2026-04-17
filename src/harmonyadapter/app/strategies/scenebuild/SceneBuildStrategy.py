from abc import ABC, abstractmethod
from app.HarmonyAdapterRequest import HarmonyAdapterRequest

class SceneBuildStrategy(ABC):

    @abstractmethod
    def build_scene(self, request: HarmonyAdapterRequest) -> str:
        """Generate preview and return preview file path"""
        pass