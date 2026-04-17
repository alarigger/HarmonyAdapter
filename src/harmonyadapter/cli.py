from app.HarmonyAdapter import HarmonyAdapter, HarmonyAdapterRepport
from app.HarmonyAdapterRequest import HarmonyAdapterRequest, HarmonyAdapterRequestFactory
from app.model.BG import BG
from app.model.Shot import Shot
from app.model.Render import Render
from app.model.Camera import Camera

import json
from argparse import ArgumentParser


def build_parser() -> ArgumentParser:
    """Construit et retourne le parseur CLI HarmonyAdapter avec les arguments requis et optionnels."""
    parser = ArgumentParser(
        prog="HarmonyAdapter",
        description="Provide a pipeline python interface for Toon boom harmony scene build and export  ",
    )

    parser.add_argument(
        "-r", "--request_name",
        required=True,
        help=(
            "Name of the request to run. "
            "Examples: build_scene"
        ),
    )
    parser.add_argument(
        "-b", "--bg_path",
        help="Path to the input Bg file",
    )    
    #obsolete
    parser.add_argument(
        "-sf", "--shot_file",
        help="Shot file (xstage or blender scene) where to place the bg",
    )      
    parser.add_argument(
        "-sp", "--scene_path",
        help="scene file (xstage or blender scene) ",
    )    
    parser.add_argument(
        "-cad", "--cadre",
        help="path to a json describing a cadre (camera placement) ",
    )   
    parser.add_argument(
        "-cam", "--camera",
        help="path to a json describing the camera  ",
    )

    parser.add_argument(
        "-sn", "--shot_name",
        help="Shot name to find the matching bg cadre",
    )
    parser.add_argument(
        "-ot", "--output_type",
        help="mp4 png tga",
    )    
    parser.add_argument(
        "-o", "--output_path",
        help="video path or image sequence pattern ",
    )    
    parser.add_argument(
        "-j", "--json_path",
        help="report json ",
    )    
    parser.add_argument(
        "-ji", "--json_input_path",
        help="report json ",
    )

    return parser


if __name__ == "__main__":
    """
    Convert CLI input to a HarmonyAdapterRequest and execute it
    """
    
    request_factory = HarmonyAdapterRequestFactory()

    parser = build_parser()
    args = parser.parse_args()
    
    request:HarmonyAdapterRequest = request_factory.parse_from_cli(args)

    # --- Execute ---
    HarmonyAdapter = HarmonyAdapter()
    print(" Treating CLI Request ")
    print(request)
    report: HarmonyAdapterRepport = HarmonyAdapter.treat(request)

    print(report)
    

    # --- Write JSON output if requested ---
    if request.json_path:
        if report:
            if not report.content:
                print("Nothing to write...")
            else:
                with open(request.json_path, "w", encoding="utf-8") as file:
                    json.dump(report.content, file, indent=4)