from dataclasses import asdict
from typing import Callable

from .CadreDetector import CadreDetector
from .ProxyGenerator import ProxyGenerator
from ..PathResolver import PathResolver
from ..HarmonyAdapterRequest import HarmonyAdapterRequest


class AssetEnricher:
    """
    Enriches asset files depending on file type or enrichement strategy .
    """

    # -------------------------------------------------------------------------
    # GLOBAL STRATEGY REGISTRY
    # -------------------------------------------------------------------------

    _STRATEGIES: dict[str, Callable] = {}

    # -------------------------------------------------------------------------
    # DECORATOR
    # -------------------------------------------------------------------------

    @classmethod
    def register_strategy(cls, name: str):
        """
        Register a new enrichment strategy.

        Example:
            @AssetEnricher.register_strategy("PSD")
            def enrich_psd(...):
                ...
        """

        def decorator(func: Callable):
            cls._STRATEGIES[name.upper()] = func
            return func

        return decorator

    # -------------------------------------------------------------------------
    # INIT
    # -------------------------------------------------------------------------

    def __init__(self):
        ...

    # -------------------------------------------------------------------------
    # PUBLIC METHODS
    # -------------------------------------------------------------------------

    def enrich_assets(self,request: HarmonyAdapterRequest,assets: list[dict]) -> list[dict]:

        return [
            self.enrich_asset(request, asset)
            for asset in assets
        ]

    def enrich_asset(self,request: HarmonyAdapterRequest,asset: dict) -> dict:

        enriched_asset = dict(asset)

        enriched_asset["files"] = [
            self.enrich_assetfile(request, assetfile)
            for assetfile in asset.get("files", [])
        ]

        return enriched_asset

    def enrich_assetfile(self,request: HarmonyAdapterRequest,assetfile: dict) -> dict:
        """
        Dispatch enrichment strategy.
        """

        strategy_name = assetfile.get("enrichment_strategy") or assetfile.get("type")

        if not strategy_name:
            return assetfile

        strategy = self._STRATEGIES.get(
            strategy_name.upper()
        )

        if strategy is None:
            return assetfile

        try:
            return strategy(self,request,assetfile)

        except Exception as e:

            print(
                f"[AssetEnricher] Failed enriching "
                f"{assetfile.get('path')} "
                f"({strategy_name}) : {e}"
            )

            return assetfile


# PSD STRATEGY
@AssetEnricher.register_strategy("PSB")
@AssetEnricher.register_strategy("PSD") # todo use the strategy 'parse_cadre_and_generate_proxy' in the assetfile dict
def enrich_psd_assetfile(self,request: HarmonyAdapterRequest,assetfile: dict) -> dict:
    """
    PSD-specific enrichment.
    """

    enriched = dict(assetfile)

    # Resolve source path
    resolved_path = PathResolver.resolve(
        assetfile.get("path")
    )

    print(f"[AssetEnricher] PSD resolved: {resolved_path}")

    # Detect cadres
    cadre_detector = CadreDetector()
    cadres = cadre_detector.parse_cadres(resolved_path)

    print(f"[AssetEnricher] Detected cadres: {cadres}")
    
    # Generate proxy image
    proxy_image_path = ProxyGenerator.from_psd(resolved_path,"png","_next_to_source_")
    

    # Resolve current shot and select the matching cadre 
    shot = request.get_shot()

    filtered_cadres = cadres

    if shot and shot.name:
        filtered_cadres = [
            cadre
            for cadre in cadres
            if cadre.shot == shot.name
        ]

    # Computed metadata
    enriched["computed"] = {
        "cadres": [
            asdict(cadre)
            for cadre in filtered_cadres
        ],
        "proxy_image": proxy_image_path,
    }

    return enriched

# PSD STRATEGY
@AssetEnricher.register_strategy("parse_cadre_and_generate_proxy")
def enrich_psd_assetfile(self,request: HarmonyAdapterRequest,assetfile: dict) -> dict:
    """
    PSD-specific enrichment.
    """

    enriched = dict(assetfile)

    # Resolve source path
    resolved_path = PathResolver.resolve(
        assetfile.get("path")
    )

    print(f"[AssetEnricher] PSD resolved: {resolved_path}")

    # Detect cadres
    cadre_detector = CadreDetector()
    cadres = cadre_detector.parse_cadres(resolved_path)

    print(f"[AssetEnricher] Detected cadres: {cadres}")
    
    # Generate proxy image
    proxy_image_path = ProxyGenerator.from_psd(resolved_path,"png","_next_to_source_")
    

    # Resolve current shot and select the matching cadre 
    shot = request.get_shot()

    filtered_cadres = cadres

    if shot and shot.name:
        filtered_cadres = [
            cadre
            for cadre in cadres
            if cadre.shot == shot.name
        ]

    # Computed metadata
    enriched["computed"] = {
        "cadres": [
            asdict(cadre)
            for cadre in filtered_cadres
        ],
        "proxy_image": proxy_image_path,
    }

    return enriched


@AssetEnricher.register_strategy("TPL")
def enrich_fbx(self,request: HarmonyAdapterRequest,assetfile: dict)->dict:
    return assetfile