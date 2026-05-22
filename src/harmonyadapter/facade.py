from app.HarmonyAdapter import HarmonyAdapter
from app.HarmonyAdapterRequest import (
    HarmonyAdapterRequestFactory
)


class HarmonyAdapterFacade:
    def __init__(self):
        self._engine = HarmonyAdapter()
        self._factory = HarmonyAdapterRequestFactory()

    def _run_request(self, name: str, **kwargs):
        request = self._factory.parse_from_module_func(
            name,
            **kwargs
        )
        return self._engine.treat(request)

    def build_scene(
        self,
        scene_path: str,
        shot_name: str = None,
        json_input: str = None,
        library_path: str = None
        ):
        
        return self._run_request(
            name="build_scene",
            scene_path=scene_path,
            shot_name=shot_name,
            json_input_path=json_input,
            library_path=library_path
        )