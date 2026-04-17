"""Library for generating preview render of backgrounds in shots """

from .app.HarmonyAdapter import HarmonyAdapter
from .app.HarmonyAdapterRequest import HarmonyAdapterRequest,HarmonyAdapterRequestFactory
from typing import Dict, Any,List

__all__ = [
    "HarmonyAdapter",
    "preview_shot"
]

def _run_request(name: str, bg_path: str, **kwargs) -> dict:
    request_factory = HarmonyAdapterRequestFactory()
    request = request_factory.parse_from_module_func(name,bg_path, **kwargs)
    harmonyadapter = HarmonyAdapter()
    return harmonyadapter.treat(request)


def preview_shot(bg_path) -> List[dict]:
    '''
        preview bg file in shot context (match camera)
    '''
    return _run_request("preview_shot",bg_path)




