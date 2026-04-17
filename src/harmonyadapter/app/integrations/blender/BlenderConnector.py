import json
from app.integrations.Connector import Connector

class BlenderConnector(Connector):

    def __init__(self):
        super().__init__("blender")

    def run_script(self,scene_path:str, scirpt_name: str, args: dict | None = None):
        ...
        
    def _serialise_args(self,args:dict)->str:
        return json.dumps(args)
        ...

    def render(self, scene_path: str, output_path: str=None)->str:
        ...
            
        return output_path
        
            