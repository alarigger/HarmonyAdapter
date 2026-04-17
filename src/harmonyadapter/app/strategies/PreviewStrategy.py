from abc import ABC, abstractmethod
from app.HarmonyAdapterRequest import HarmonyAdapterRequest

class PreviewStrategy(ABC):

    @abstractmethod
    def generate_preview(self, request: HarmonyAdapterRequest) -> str:
        """Generate preview and return preview file path"""
        pass