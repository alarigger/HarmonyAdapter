from dataclasses import asdict
from typing import Callable

from .CadreDetector import CadreDetector
from .ProxyGenerator import ProxyGenerator
from .PathResolver import PathResolver
from ..model.Shot import ShotNameParser
from ..HarmonyAdapterRequest import HarmonyAdapterRequest


class AssetEnricher:
    """
    Enriches asset dictionaries by computing metadata
    depending on each assetfile type.
    """

    def __init__(self):
        self._cadre_detector = CadreDetector()

        # Strategy registry
        self._strategies: dict[str, Callable[[dict], dict]] = {
            "PSD": self._enrich_psd_assetfile,
            # "FBX": self._enrich_fbx_assetfile,
            # "MOV": self._enrich_mov_assetfile,
        }

    # -------------------------------------------------------------------------
    # PUBLIC METHODS
    # -------------------------------------------------------------------------

    def enrich_assets(self,request:HarmonyAdapterRequest, assets: list[dict]) -> list[dict]:
        """
        Enrich a full list of assets.
        """
        return [self.enrich_asset(request,asset) for asset in assets]

    def enrich_asset(self, request:HarmonyAdapterRequest,asset: dict) -> dict:
        """
        Enrich a single asset.
        """
        enriched_asset = dict(asset)

        enriched_asset["files"] = [
            self.enrich_assetfile(request,assetfile)
            for assetfile in asset.get("files", [])
        ]

        return enriched_asset

    def enrich_assetfile(self,request:HarmonyAdapterRequest, assetfile: dict) -> dict:
        """
        Dispatch enrichment depending on assetfile type.
        """
        strategy_name = assetfile.get("type") # todo replace with "enrichement strategy name" in the json later 

        if not strategy_name:
            return assetfile

        strategy = self._strategies.get(strategy_name)

        if strategy is None:
            return assetfile

        try:
            return strategy(request,assetfile)

        except Exception as e:
            print(
                f"[AssetEnricher] Failed enriching "
                f"{assetfile.get('path')} ({strategy_name}) : {e}"
            )

            return assetfile

    # -------------------------------------------------------------------------
    # PSD ENRICHMENT
    # -------------------------------------------------------------------------

    def _enrich_psd_assetfile(self,request:HarmonyAdapterRequest, assetfile: dict) -> dict:
        """
        PSD-specific enrichment:
        - cadre extraction
        - proxy generation
        """

        enriched = dict(assetfile)

        # Resolve source path
        resolved_path = PathResolver.resolve(
            assetfile.get("path")
        )

        print(f"[AssetEnricher] PSD resolved: {resolved_path}")

        # Detect cadres
        cadres = self._cadre_detector.parse_cadres(resolved_path)

        print(f"[AssetEnricher] Detected cadres: {cadres}")

        # Generate proxy image
        proxy_image_path = ProxyGenerator.from_psd(
            resolved_path,
            "png",
            "_next_to_source_"
        )
        
        shot = request.get_shot()
        
        if not shot.name:
            return assetfile

        enriched["computed"] = {
            "cadres": [
                asdict(cadre)
                for cadre in cadres if cadre.shot == shot.name 
            ],
            "proxy_image": proxy_image_path,
        }

        return enriched