from typing import List,Dict,Callable
import json
from app.HarmonyAdapterRequest import HarmonyAdapterRequest
from app.strategies.preview.PreviewStrategyFactory import PreviewStrategyFactory
from app.strategies.scenebuild.SceneBuildStrategyFactory import SceneBuildStrategyFactory
import copy
import os 

        
class HarmonyAdapterRepport():
    '''
        report object used to standardise outputs
        HarmonyAdapter methods should return an instrance of this class for better predictatbility
    '''
    def __init__(self):
        self.content:dict = None
        self.errors:List[str] = []

    def __str__(self)->str:
        return json.dumps(self.content,indent=4)
    
    

class HarmonyAdapter():
    '''
        main class of the app 
        methods are registerd via a decorator in order to scale the features more easily 
        methodes are called based on request names 
    '''
    _registry:Dict[str,Callable] = {}

    def __init__(self):
        ...
        
    def complete_request(self,request:HarmonyAdapterRequest)->HarmonyAdapterRequest:
        completed_request = copy.deepcopy(request)
        return completed_request

    def treat(self,request:HarmonyAdapterRequest)->HarmonyAdapterRepport:
        '''
            find the handler method matching the request name in the registry table and execute it , return a HarmonyAdapterRepport
        '''
        if not request.name:
            raise ValueError(f"request has no name ")
        handler:Callable = self._registry.get(request.name)
        if not handler:
            raise ValueError(f"no method found for request {request.name}")
        return handler(self,copy.deepcopy(request)) # pass a request copy 
        ...

    @classmethod
    def _register_handler(cls,name:str):
        '''
            add the handler (command or action) to the registry by its name 
        '''
        def decorator(func:Callable):
            cls._registry[name] = func
            return func
        return decorator
    
    


'''

 Handlers : 

    easily add new feature here 

'''
@HarmonyAdapter._register_handler("preview_shot")
def preview_shot(self:HarmonyAdapter,request:HarmonyAdapterRequest)->HarmonyAdapterRepport:
    '''
        position the background image in front of the shot camera and render the video  
    '''
    report = HarmonyAdapterRepport()
    factory = PreviewStrategyFactory()

    strategy = factory.get_strategy(request.get_software())
    temp_video = strategy.generate_preview(request)
    
    return report

    ...
    
@HarmonyAdapter._register_handler("build_scene")
def preview_shot(self:HarmonyAdapter,request:HarmonyAdapterRequest)->HarmonyAdapterRepport:
    '''
        build scene for animation 
    '''
    report = HarmonyAdapterRepport()
    factory = SceneBuildStrategyFactory()

    strategy = factory.get_strategy(request.get_software())
    new_scene = strategy.build_scene(request)
    
    return report

    ...
    


