from app.strategies.preview.PreviewStrategy import PreviewStrategy
from app.HarmonyAdapterRequest import HarmonyAdapterRequest,InvalidHRequest
from app.HarmonyAdapterRequestCompleter import HarmonyAdapterRequestCompleter
from app.integrations.harmony.HarmonyConnector import HarmonyConnector
from app.ProjectPaths import ProjectPaths

from dataclasses import replace, asdict
from psd_tools import PSDImage
import os
import tempfile
import uuid

class HarmonyPreviewStrategy(PreviewStrategy):

    def generate_preview(self, request: HarmonyAdapterRequest) -> str:
        self._validate_request(request)


        bg = completed_request.bg

        harmony = HarmonyConnector()
        scene_path = completed_request.shot.path

        args = {
            "bg_png_path":self._convert_psd_to_png(bg.path),
            "bg": asdict(completed_request.bg),
            "shot": asdict(completed_request.shot)
        }

        harmony.run_script(scene_path, "apply_bg_cadre", args)
        harmony.render(scene_path,completed_request.render.output_path)

        return "preview_generated"

    def _validate_request(self, request: HarmonyAdapterRequest):

        if request is None:
            raise InvalidHRequest("Preview request cannot be None")

        if request.shot is None or not request.shot.path:
            raise InvalidHRequest("Shot or shot path is missing")

        if request.bg is None or not request.bg.path:
            raise InvalidHRequest("Background or background path is missing")

        if request.render is None or not request.render.output_path:
            raise InvalidHRequest("Render or render output path is missing")
        
    def _convert_psd_to_png(self, psd_path: str) -> str:


        temp_dir = tempfile.gettempdir()
        png_path = os.path.join(temp_dir, f"{uuid.uuid4()}.png")
        psd = PSDImage.open(psd_path)
        psd.composite().save(png_path)

        return png_path