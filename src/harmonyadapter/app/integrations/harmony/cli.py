import argparse
import sys
from pathlib import Path
import json
    
# add parent folder to sys.path
#sys.path.append(str(Path(__file__).resolve().parent.parent))


from app.integrations.harmony.HarmonyConnector import HarmonyConnector

def parse_script_args(args) -> dict:
    excluded = {"xstage", "run_script", "render"}
    excluded = {}
    return {
        k: v
        for k, v in vars(args).items()
        if k not in excluded and v not in ("", None)
    }


def main():
    parser = argparse.ArgumentParser(description="Run Harmony script via connector")
    parser.add_argument(
        "-x", "--xstage", required=True, help="Path to .xstage scene"
    )
    parser.add_argument(
        "-run_script", "--run_script", help="Script name to run (without extension)"
    )    
    parser.add_argument(
        "-render", "--render", default="", help="output path"
    )
    parser.add_argument(
        "-ip", "--image_path", default="", help="image"
    )     
    parser.add_argument(
        "-pp", "--psd_path", default="", help="image"
    )    
    parser.add_argument(
        "-ij", "--input_json", default="", help="args"
    )

    args = parser.parse_args()

    scene_path = args.xstage
    script_name = args.run_script
    output_path = args.render

    # optional args from JSON string
    script_args = parse_script_args(args)

    # --- run Harmony connector ---
    connector = HarmonyConnector()
    print(f"Running Harmony script '{script_name}' on scene '{scene_path}'...")

    try:
        if args.run_script:
            connector.run_script(scene_path,script_name, script_args)
            
        if args.render:
            connector.render(scene_path,output_path)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
        
        

if __name__ == "__main__":
    main()