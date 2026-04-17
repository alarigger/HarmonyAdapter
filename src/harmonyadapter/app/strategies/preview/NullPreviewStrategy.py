
import subprocess
from app.strategies.preview.PreviewStrategy import PreviewStrategy
from app.HarmonyAdapterRequest import HarmonyAdapterRequest

class NullPreviewStrategy(PreviewStrategy):

    def generate_preview(self, request: HarmonyAdapterRequest) -> str:
        """Generate preview and return preview file path"""
        pass