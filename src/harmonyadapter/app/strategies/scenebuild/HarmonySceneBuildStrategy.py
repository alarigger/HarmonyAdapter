from app.strategies.scenebuild.SceneBuildStrategy import SceneBuildStrategy
from app.HarmonyAdapterRequest import HarmonyAdapterRequest,InvalidHRequest
from app.HarmonyAdapterRequestCompleter import HarmonyAdapterRequestCompleter
from app.integrations.harmony.HarmonyConnector import HarmonyConnector
from app.ProjectPaths import ProjectPaths
from dataclasses import replace, asdict
from psd_tools import PSDImage
import os
import tempfile
import uuid
import json

class InvalidSceneBuildRequest(Exception):
    pass


class HarmonySceneBuildStrategy(SceneBuildStrategy):

    def build_scene(self, request: HarmonyAdapterRequest) -> str:
        
        self._validate_request(request)
        harmony = HarmonyConnector()
        scene_path = request.scene_path
        print(os.getenv("HARMONY_LIBRARY_PATH"))
        args = {
            "json_input_path": request.json_input_path
        }

        harmony.run_script(scene_path, "build_scene", args)

        return "scene_built"

    def _validate_request(self, request: HarmonyAdapterRequest):

        if request is None:
            raise InvalidSceneBuildRequest("Scene request cannot be None")

        if request.scene_path is None:
            raise InvalidSceneBuildRequest("scene_path or shot path is missing") 

        if request.json_input_path is None:
            raise InvalidSceneBuildRequest("json_input_path is missing")
        '''
        if request.render is None or not request.render.output_path:
            raise InvalidHRequest("Render or render output path is missing")
        '''
        
        