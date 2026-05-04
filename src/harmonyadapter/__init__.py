# NOTE(cléa, 2026-04) — Ce fichier est à raccorder plus tard à PSD_READER

# from .main import (
#     extract_cadres,
#     get_shot_cadre,
#     convert_to_json,
# )

# NOTE(cléa, 2026-04) — PROCHAINE ÉTAPE : mise à jour des décors en PSD
# Alarigger ( Alex C) a conservé dans ce repo la logique PrevizBG (BG.py, Cadre.py,
# PSDReaderConnector.py, bg_cadre.js) pour une intégration future.
# Le repo source sur mon poste est : C:\Users\miyu.user162\Documents\002_DEV\PrevizBGAlex
# (branche pervizbg_connector du repo MISTstudio/PSD_Reader).
# Le flux prévu :
#   1. Lire un BG en PSD via PSDReaderConnector → extraire les Cadres par shot
#   2. Positionner le BG dans Harmony selon la géométrie caméra (bg_cadre.js)
# Pour l'instant, le Scene Builder utilise un flux simplifié JPG (import flat)
# qui est la première étape du scene build. Le flux PSD viendra ensuite.

from .main import HarmonyAdapter, preview_shot
from .app.HarmonyAdapterRequest import HarmonyAdapterRequest, HarmonyAdapterRequestFactory
# "extract_cadres",
# "get_shot_cadre",
# "convert_to_json",

__all__ = [
    "HarmonyAdapter",
    "HarmonyAdapterRequest",
    "HarmonyAdapterRequestFactory",
    "preview_shot",
]