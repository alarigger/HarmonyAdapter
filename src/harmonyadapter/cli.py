import json
from argparse import ArgumentParser

from app.HarmonyAdapter import HarmonyAdapter, HarmonyAdapterRepport
from app.HarmonyAdapterRequest import (
    HarmonyAdapterRequest,
    HarmonyAdapterRequestFactory,
)


def build_parser() -> ArgumentParser:
    
    parser = ArgumentParser(
        prog="HarmonyAdapter",
        description="Provide a pipeline python interface for Toon Boom Harmony scene build and export",
    )

    parser.add_argument(
        "-r", "--request_name",
        required=True,
    )

    parser.add_argument("-b", "--bg_path")
    parser.add_argument("-sf", "--shot_file")
    parser.add_argument("-sp", "--scene_path")
    parser.add_argument("-cad", "--cadre")
    parser.add_argument("-cam", "--camera")
    parser.add_argument("-sn", "--shot_name")
    parser.add_argument("-ot", "--output_type")
    parser.add_argument("-o", "--output_path")
    parser.add_argument("-j", "--json_path")
    parser.add_argument("-ji", "--json_input_path")

    return parser


def main():
    request_factory = HarmonyAdapterRequestFactory()

    parser = build_parser()
    args = parser.parse_args()

    request: HarmonyAdapterRequest = request_factory.parse_from_cli(args)

    harmony_adapter = HarmonyAdapter()

    print("Treating CLI Request")
    print(request)

    report: HarmonyAdapterRepport = harmony_adapter.treat(request)

    print(report)

    if request.json_path:
        if report and report.content:
            with open(request.json_path, "w", encoding="utf-8") as file:
                json.dump(report.content, file, indent=4)
        else:
            print("Nothing to write...")


if __name__ == "__main__":
    main()