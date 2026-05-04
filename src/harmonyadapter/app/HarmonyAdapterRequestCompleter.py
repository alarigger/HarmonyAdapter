from app.model.BG import BG
from app.model.Shot import Shot
from app.model.Render import Render
from app.model.Camera import Camera
from app.model.Software import Software
from app.HarmonyAdapterRequest import HarmonyAdapterRequest
from app.complete.CadreDetector import CadreDetector
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
    _cadre_detector = CadreDetector()

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
    def _complete_build_scene(self, request: HarmonyAdapterRequest) -> HarmonyAdapterRequest:
        if request.json_input_path is None:
            return request

        with open(request.json_input_path, "r") as f:
            data = json.load(f)

        assets = data.get("casting", {}).get("assets", [])

        enriched_assets = []
        for asset in assets:
            enriched_assets.append(self._enrich_asset(asset))

        data["casting"]["assets"] = enriched_assets

        # Write enriched JSON
        output_path = request.json_input_path.replace(".json", "_enriched.json")

        with open(output_path, "w") as f:
            json.dump(data, f, indent=4)

        # RETURN NEW REQUEST (don’t mutate)
        return replace(
            request,
            json_input_path=output_path
        )
            
        
    # ENRICHEMENT LEVEL 
    def _enrich_asset(self,asset:dict)->dict:
        enriched_asset_files = []
        for assetfile in asset.get("files", []):
            enriched_asset_files.append(self._enrich_assetfile(assetfile))
        asset["files"] = enriched_asset_files
        return asset
           
    def _enrich_assetfile(self,assetfile:dict)->dict:
        if assetfile.get("type") == "PSD":
            return self._enrich_psd_assetfile(assetfile)
        return assetfile       

    def _enrich_psd_assetfile(self, assetfile: dict) -> dict:

        # resolve path first
        resolved_path = PathResolver.resolve(assetfile.get("path"))
        
        print(resolved_path)

        # run detection on real file
        cadres = self._cadre_detector.parse_cadres(resolved_path)
        print(cadres)

        assetfile["computed"] = {
            "cadres": [asdict(cadre) for cadre in cadres]
        }

        return assetfile 
        
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
        
        print("-------------------------- completed request ---------------------------")
        print(completed_request)
        print("------------------------------------------------------------------------")

        # Return NEW immutable instance
        return completed_request

    def _detect_cadres(self, path):
        # call your CadreDetector here
        return []

    def _extract_shot_name(self, path):
        return path.split("/")[-1].split(".")[0]
    

class PathResolver:

    @staticmethod
    def resolve(path: str) -> str:
        if not path:
            return path

        library_root = os.getenv("HARMONY_LIBRARY_PATH")

        if "__LIBRARY__" in path:
            if not library_root:
                raise RuntimeError("HARMONY_LIBRARY_PATH is not set")

            path = path.replace("__LIBRARY__", library_root)

        return os.path.normpath(path)