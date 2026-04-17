from app.model.BG import BG
from app.model.Shot import Shot
from app.model.Render import Render
from app.model.Camera import Camera
from app.model.Software import Software
from app.HarmonyAdapterRequest import HarmonyAdapterRequest
from app.complete.CadreDetector import CadreDetector
from dataclasses import replace



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