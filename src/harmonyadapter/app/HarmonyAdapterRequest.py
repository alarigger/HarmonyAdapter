from app.model.BG import BG,BGFactory
from app.model.Cadre import Cadre,CadreFactory
from app.model.Shot import Shot
from app.model.Render import Render
from app.model.Build import Build
from app.model.Camera import Camera
from app.model.Software import Software
from typing import Optional
from dataclasses import dataclass, field
from typing import Optional

class InvalidHRequest(Exception):
    pass

@dataclass(frozen=True)
class HarmonyAdapterRequest:
    """
    Request object used to standardize inputs.
    Input modules (UI, CLI) should instantiate this class and pass it to
    the main HarmonyAdapter process method.
    """
    name: Optional[str] = None
    bg: Optional['BG'] = None
    shot: Optional['Shot'] = None
    render: Optional['Render'] = None
    json_path: Optional[str] = None
    json_input_path: Optional[str] = None
    output_path:Optional[str] = None
    build:Optional['Build'] = None
    scene_path:Optional[str] = None

    def __str__(self) -> str:
        """
        Recursive, pretty-printed string representation for the full request.
        """
        lines = [f"HarmonyAdapterRequest '{self.name or 'Unnamed'}'"]

        # BG
        if self.bg:
            lines.append(f"  BG:")
            lines.append(f"    Path   : {self.bg.path or 'None'}")
            lines.append(f"    Size   : {self.bg.width}x{self.bg.height}")
            lines.append(f"    Cadres : {len(self.bg.cadres)} items")
            for i, cadre in enumerate(self.bg.cadres, 1):
                lines.append(f"      Cadre {i}: {cadre}")

        else:
            lines.append("  BG     : None")

        # Shot
        if self.shot:
            lines.append(f"  Shot:")
            lines.append(f"    Path   : {self.shot.path or 'None'}")
            if getattr(self.shot, "name", None):
                lines.append(f"    Name   : {self.shot.name}")
            lines.append(f"    Camera : {self.shot.camera or 'None'}")
        else:
            lines.append("  Shot   : None")

        # Render
        if self.render:
            lines.append(f"  Render:")
            lines.append(f"    Output Path : {self.render.output_path or 'None'}")
            lines.append(f"    Output Type : {self.render.output_type or 'None'}")
        else:
            lines.append("  Render : None")   
                 
        # Build
        if self.render:
            lines.append(f"  Build:")
            lines.append(f"    Output Path : {self.render.output_path or 'None'}")
        else:
            lines.append("  Build : None")

        # JSON Path
        lines.append(f"  JSON Path : {self.json_path or 'None'}")
        lines.append(f"  JSON INPUT Path : {self.json_input_path or 'None'}")

        return "\n".join(lines)
    
    def get_software(self)->Software:
        if self.scene_path:
            return Software.from_file(self.scene_path)
        if self.shot and self.shot.path:
            return Software.from_file(self.shot.path)        
        return Software.UNKNOWN
    
class HarmonyAdapterRequestFactory():
    '''
        request object used to standardise inputs 
        input modules (UI,CLI) should create instanciate this class and then pass it the main class 'HarmonyAdapter' treat method 
    '''
    def __init__(self):
        ...


    @staticmethod
    def parse_from_cli(cli_args) -> HarmonyAdapterRequest:
        """
        Maps CLI arguments into a fully constructed HarmonyAdapterRequest object.
        Supported CLI args:
            -r, --request_name
            -b, --bg_path
            -sf, --shot_file
            -sn, --shot_name
            -ot, --output_type
            -o, --output_path
            -cad, --cadre
            -cam, --camera
            -j, --json_path
            -x, -- xstage_
            -ij, --json_input_path
        """
        # -------- Request name --------
        name = cli_args.request_name

        # -------- Background --------
        bg = None
        if cli_args.bg_path or cli_args.cadre:
            # Prepare cadres list
            cadres_list: list = []

            if cli_args.cadre:
                # If it's a JSON file path, parse it
                if isinstance(cli_args.cadre, str):
                    cadres_list = CadreFactory.from_json_path(cli_args.cadre)
                # If it's already a list of Cadres
                elif isinstance(cli_args.cadre, list):
                    cadres_list = cli_args.cadre
                # If it's a single Cadre
                else:
                    cadres_list = [cli_args.cadre]

            # Create BG using the factory
            bg = BGFactory.create(
                name=None,  # Let the factory derive name from path if needed
                path=cli_args.bg_path,
                cadres=cadres_list
            )

        # -------- Shot --------
        shot = None
        if cli_args.shot_file or cli_args.shot_name or cli_args.camera:
            shot = Shot()

            if cli_args.shot_file:
                shot.path = cli_args.shot_file

            if hasattr(shot, "name") and cli_args.shot_name:
                shot.name = cli_args.shot_name

            if cli_args.camera:
                if isinstance(cli_args.camera, Camera):
                    shot.camera = cli_args.camera
                else:
                    camera = Camera()
                    camera.name = str(cli_args.camera)
                    shot.camera = camera

        # -------- Render --------
        render = None
        if cli_args.output_path or cli_args.output_type:
            render = Render()

            if cli_args.output_path:
                render.output_path = cli_args.output_path

            if cli_args.output_type:
                render.output_type = cli_args.output_type
                
                
        build = None
        # -------- Build --------
        if cli_args.output_path:
            build = Build()
            build.output_path = cli_args.output_path
            build.json = cli_args.json_input_path if cli_args.json_input_path else None

        # -------- JSON --------
        json_path = cli_args.json_path if cli_args.json_path else None        
        
        # --------INPUT JSON --------
        json_input_path = cli_args.json_input_path if cli_args.json_input_path else None
        
        # --------INPUT SCENE --------
        scene_path = cli_args.scene_path if cli_args.scene_path else None

        # Single immutable construction
        return HarmonyAdapterRequest(
            name=name,
            bg=bg,
            shot=shot,
            render=render,
            json_path=json_path,
            json_input_path=json_input_path,
            build=build,
            scene_path=scene_path
        )

        
        
    def parse_from_module_func(self,name: str,bg_path: str,**kwargs) -> HarmonyAdapterRequest:

        # Build BG object first (if relevant to your design)
        bg = BG(path=bg_path) if bg_path else None

        # Build base argument dictionary
        data = {
            "name": name,
            "bg": bg,
        }

        # Merge extra allowed fields
        data.update(kwargs)

        # Single immutable construction
        return HarmonyAdapterRequest(**data)