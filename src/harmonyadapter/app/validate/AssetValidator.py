import os
from typing import Callable, Dict, List

from ..PathResolver import PathResolver
from ..HarmonyAdapterRequest import HarmonyAdapterRequest


class AssetValidator:
    """
    Validates asset dictionaries depending on file type.

    Responsibilities:
        - resolve paths
        - check file existence
        - run file-type validation strategies
    """

    # -------------------------------------------------------------------------
    # STRATEGY REGISTRY
    # -------------------------------------------------------------------------

    _STRATEGIES: Dict[str, Callable] = {}

    # -------------------------------------------------------------------------
    # DECORATOR
    # -------------------------------------------------------------------------

    @classmethod
    def register_strategy(cls, *names: str):

        def decorator(func: Callable):

            for name in names:
                cls._STRATEGIES[name.upper()] = func

            return func

        return decorator

    # -------------------------------------------------------------------------
    # PUBLIC API
    # -------------------------------------------------------------------------

    def validate_assets(
        self,
        request: HarmonyAdapterRequest,
        assets: list[dict]
    ) -> list[str]:

        errors: list[str] = []

        for asset in assets:
            errors.extend(
                self.validate_asset(request, asset)
            )

        return errors

    def validate_asset(
        self,
        request: HarmonyAdapterRequest,
        asset: dict
    ) -> list[str]:

        errors: list[str] = []

        for assetfile in asset.get("files", []):

            errors.extend(
                self.validate_assetfile(
                    request,
                    assetfile
                )
            )

        return errors

    def validate_assetfile(
        self,
        request: HarmonyAdapterRequest,
        assetfile: dict
    ) -> list[str]:

        errors: list[str] = []

        raw_path = assetfile.get("path")

        if not raw_path:
            errors.append("Missing assetfile path")
            return errors

        # ---------------------------------------------------------------------
        # 1. Resolve path first (IMPORTANT)
        # ---------------------------------------------------------------------

        resolved_path = PathResolver.resolve(raw_path)

        assetfile["_resolved_path"] = resolved_path  # optional debug hook

        # ---------------------------------------------------------------------
        # 2. File existence check
        # ---------------------------------------------------------------------

        if not os.path.exists(resolved_path):
            errors.append(
                f"File does not exist: {resolved_path}"
            )
            return errors

        # ---------------------------------------------------------------------
        # 3. Strategy-based validation
        # ---------------------------------------------------------------------

        strategy_name = assetfile.get("type")

        if not strategy_name:
            return errors

        strategy = self._STRATEGIES.get(
            strategy_name.upper()
        )

        if not strategy:
            return errors

        try:
            errors.extend(
                strategy(
                    self,
                    request,
                    assetfile,
                    resolved_path
                )
            )

        except Exception as e:
            errors.append(
                f"Validation crash for {resolved_path}: {e}"
            )

        return errors
    
@AssetValidator.register_strategy("PSD")
def validate_psd(
    self,
    request: HarmonyAdapterRequest,
    assetfile: dict,
    resolved_path: str
) -> list[str]:

    errors = []

    # Must be PSD
    if not resolved_path.lower().endswith(".psd") and not resolved_path.lower().endswith(".psb") :
        errors.append(f"Invalid PSD extension: {resolved_path}")

    return errors

