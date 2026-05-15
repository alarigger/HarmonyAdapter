
from .HarmonyAdapterRequest import HarmonyAdapterRequest
from .complete.AssetEnricher import AssetEnricher
from dataclasses import replace,asdict
from typing import Dict,Callable
import json
import os


class HarmonyAdapterRequestCompleter:
    """
    Complete missing data in request
    (psd infos, cadre rectangles, shot name, context from path, camera etc.)
    """
    
    '''
        TODO : extract camera from xstage to an universal camera descriptor and then recreate camera in harmony 
        --> enable to make bringe between harmony and blender later 
    
    '''

    def complete(self, request: HarmonyAdapterRequest) -> HarmonyAdapterRequest:
        strat = self._get_completion_strategy(request)
        return strat(request)
    
    def _get_completion_strategy(self, request: HarmonyAdapterRequest)->callable:
        _completion_strategies:Dict[str,Callable]= {
            "default":self._complete_default,
            "build_scene":self._complete_build_scene,
            "preview_shot":self._complete_preview
        }
        strat = _completion_strategies[request.name] or _completion_strategies["default"]
        return strat



    def _complete_default(self, request: HarmonyAdapterRequest) -> HarmonyAdapterRequest:
        return request
        ...
        
        
    def _complete_build_scene(self,request: HarmonyAdapterRequest) -> HarmonyAdapterRequest:

        if request.json_input_path is None:
            return request

        with open(request.json_input_path, "r") as f:
            data = json.load(f)

        assets = data.get("casting", {}).get("assets", [])

        enricher = AssetEnricher()

        data["casting"]["assets"] = enricher.enrich_assets(request,assets)

        output_path = request.json_input_path.replace(
            ".json",
            "_enriched.json"
        )

        with open(output_path, "w") as f:
            json.dump(data, f, indent=4)

        return replace(
            request,
            json_input_path=output_path
        )

        
    def _complete_preview(self, request: HarmonyAdapterRequest) -> HarmonyAdapterRequest:

        bg = request.bg
        shot = request.shot
        render = request.render
        name = request.name

        # Example 1 — Complete BG cadres
        if bg and not bg.cadres:
            detected_cadres = self._cadre_detector.parse_cadres(bg.path)
            bg = replace(bg, cadres=detected_cadres)

        # Example 2 — Complete shot name from path
        if shot and not shot.name and shot.path:
            derived_name = self._extract_shot_name(shot.path)
            shot = replace(shot, name=derived_name)

        # Example 3 — Derive request name if missing
        if not name and shot and shot.name:
            name = f"Previz_{shot.name}"
            
        completed_request = replace(
            request,
            name=name,
            bg=bg,
            shot=shot,
            render=render
        )

        # Return NEW immutable instance
        return completed_request

    def _detect_cadres(self, path):
        # call your CadreDetector here
        return []

    def _extract_shot_name(self, path):
        return path.split("/")[-1].split(".")[0]
    
