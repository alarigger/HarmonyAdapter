from dataclasses import replace
from typing import Dict, Callable
import json

from .HarmonyAdapterRequest import HarmonyAdapterRequest
from .complete.AssetEnricher import AssetEnricher
from .complete.CadreDetector import CadreDetector
from .model.Shot import ShotNameParser


class HarmonyAdapterRequestCompleter:
    """
    Complete missing request data.

    Examples:
        - PSD metadata
        - cadre rectangles
        - shot name
        - camera extraction
        - render settings
        - pipeline context
    """
    '''
        TODO : extract camera from xstage to an universal camera descriptor and then recreate camera in harmony 
        --> enable to make bringe between harmony and blender later 
    
    '''

    # -------------------------------------------------------------------------
    # GLOBAL REGISTRY
    # -------------------------------------------------------------------------

    _COMPLETION_STRATEGIES: Dict[str, Callable] = {}

    # -------------------------------------------------------------------------
    # DECORATOR
    # -------------------------------------------------------------------------

    @classmethod
    def register_strategy(cls, *names: str):

        def decorator(func):

            for name in names:
                cls._COMPLETION_STRATEGIES[
                    name.lower()
                ] = func

            return func

        return decorator

    # -------------------------------------------------------------------------
    # INIT
    # -------------------------------------------------------------------------

    def __init__(self):

        self._cadre_detector = CadreDetector()

    # -------------------------------------------------------------------------
    # PUBLIC API
    # -------------------------------------------------------------------------

    def complete(
        self,
        request: HarmonyAdapterRequest
    ) -> HarmonyAdapterRequest:

        strategy_name = (
            request.name or "default"
        ).lower()

        strategy = self._COMPLETION_STRATEGIES.get(
            strategy_name,
            self._complete_default
        )

        return strategy(self, request)

    # -------------------------------------------------------------------------
    # DEFAULT
    # -------------------------------------------------------------------------

    def _complete_default(
        self,
        request: HarmonyAdapterRequest
    ) -> HarmonyAdapterRequest:

        return request


# =============================================================================
# BUILD SCENE
# =============================================================================

@HarmonyAdapterRequestCompleter.register_strategy("build_scene","build",)
def complete_build_scene(
    self,
    request: HarmonyAdapterRequest
) -> HarmonyAdapterRequest:

    # yes the request class is a bit overkill for this command as it almost just passes the json path to the js engine 
    # todo : integrate the json content to the request properly (with model classes ) and creat the json file at the end 
    if request.json_input_path is None:
        return request

    with open(request.json_input_path, "r") as f:
        data = json.load(f)

    assets = data.get(
        "casting",
        {}
    ).get(
        "assets",
        []
    )

    # will enrich assets depending on file type or explicit strategy name 
    enricher = AssetEnricher()

    data["casting"]["assets"] = (
        enricher.enrich_assets(
            request,
            assets
        )
    )

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


# =============================================================================
# PREVIEW obsolete command now 
# =============================================================================

@HarmonyAdapterRequestCompleter.register_strategy("preview_shot","preview","previz",)
def complete_preview(
    self,
    request: HarmonyAdapterRequest
) -> HarmonyAdapterRequest:

    bg = request.bg
    shot = request.shot
    render = request.render
    name = request.name

    # -------------------------------------------------------------------------
    # Complete BG cadres
    # -------------------------------------------------------------------------

    if bg and not bg.cadres:

        detected_cadres = (
            self._cadre_detector.parse_cadres(
                bg.path
            )
        )

        bg = replace(
            bg,
            cadres=detected_cadres
        )

    # -------------------------------------------------------------------------
    # Complete shot name
    # -------------------------------------------------------------------------

    if shot and not shot.name and shot.path:

        derived_name = (
            ShotNameParser.parse(
                shot.path
            )
        )

        shot = replace(
            shot,
            name=derived_name
        )

    # -------------------------------------------------------------------------
    # Auto request naming
    # -------------------------------------------------------------------------

    if not name and shot and shot.name:

        name = f"Previz_{shot.name}"

    # -------------------------------------------------------------------------
    # Return immutable request
    # -------------------------------------------------------------------------

    return replace(
        request,
        name=name,
        bg=bg,
        shot=shot,
        render=render
    )