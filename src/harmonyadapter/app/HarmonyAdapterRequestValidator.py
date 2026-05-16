from typing import Dict, Callable, Optional
import os
from .HarmonyAdapterRequest import HarmonyAdapterRequest
import json
from .validate.AssetValidator import AssetValidator

class HarmonyAdapterRequestValidator:
    """
    Validate HarmonyAdapterRequest objects.

    Validation can depend on:
        - request type
        - software
        - pipeline context
        - studio conventions
    """

    # -------------------------------------------------------------------------
    # GLOBAL REGISTRY
    # -------------------------------------------------------------------------

    _VALIDATION_STRATEGIES: Dict[str, Callable] = {}

    # -------------------------------------------------------------------------
    # DECORATOR
    # -------------------------------------------------------------------------

    @classmethod
    def register_strategy(cls, *names: str):

        def decorator(func):

            for name in names:
                cls._VALIDATION_STRATEGIES[
                    name.lower()
                ] = func

            return func

        return decorator

    # -------------------------------------------------------------------------
    # PUBLIC API
    # -------------------------------------------------------------------------

    def validate(
        self,
        request: HarmonyAdapterRequest
    ) -> list[str]:
        """
        Returns validation errors.
        Empty list means valid.
        """

        strategy_name = (
            request.name or "default"
        ).lower()

        strategy = self._VALIDATION_STRATEGIES.get(
            strategy_name,
            self._validate_default
        )

        return strategy(self, request)

    # -------------------------------------------------------------------------
    # DEFAULT
    # -------------------------------------------------------------------------

    def _validate_default(
        self,
        request: HarmonyAdapterRequest
    ) -> list[str]:

        return []


# =============================================================================
# BUILD SCENE VALIDATION
# =============================================================================

@HarmonyAdapterRequestValidator.register_strategy("build_scene","build",)
def validate_build_scene(self,request: HarmonyAdapterRequest) -> list[str]:

    errors = []

    if not request.json_input_path:
        errors.append(
            "Missing json_input_path"
        )

    elif not os.path.exists(
        request.json_input_path
    ):
        errors.append(
            f"JSON file does not exist: "
            f"{request.json_input_path}"
        )
        
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
    validator = AssetValidator()

    data["casting"]["assets"] = (
        validator.validate_assets(
            request,
            assets
        )
    )

    return errors


# =============================================================================
# PREVIEW VALIDATION -- obsolete command now 
# =============================================================================

@HarmonyAdapterRequestValidator.register_strategy("preview","preview_shot","previz",)
def validate_preview(
    self,
    request: HarmonyAdapterRequest
) -> list[str]:

    errors = []

    if not request.bg:
        errors.append(
            "Missing BG"
        )

    elif not request.bg.path:
        errors.append(
            "BG path is missing"
        )

    elif not os.path.exists(
        request.bg.path
    ):
        errors.append(
            f"BG file does not exist: "
            f"{request.bg.path}"
        )

    if not request.render:
        errors.append(
            "Missing render settings"
        )

    return errors