import json
import tempfile
import subprocess
from app.integrations.Connector import Connector
from app.model.BG import BG
from app.model.Cadre import Cadre,Rect,CadreFactory

class PSDReaderConnector(Connector):

    def __init__(self):
        super().__init__("psdreader")
        
    def parse_cadres(self, psd_path:str) -> list[Cadre]:
        """
        Convert PSDReader JSON data into a list of Cadre objects.
        """
        json_data = self._extract_cadres(psd_path)
        return CadreFactory.from_dict(json_data)
    
    def _extract_cadres(self, psd_path:str) -> dict:
        """
        Runs the PSDReader CLI to extract cadres from a PSD file and returns a dict.
        Tries the ATC-specific extraction first, then falls back to legacy extraction.
        Example CLI usage:
        "%MAIN_PATH%" -r extract_cadres -i "%psd_path%" -o "%json_path%"
        """

        # Create a temporary file for the JSON output
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp_file:
            json_path = tmp_file.name

        commands = [
            [
                self._quote(self._main_path),
                "-r", "extract_cadres_atc",
                "-i", self._quote(psd_path),
                "-o", self._quote(json_path)
            ],
            [
                self._quote(self._main_path),
                "-r", "extract_cadres",
                "-i", self._quote(psd_path),
                "-o", self._quote(json_path)
            ],
        ]

        last_result = None
        for cmd in commands:
            result = subprocess.run(cmd, capture_output=True, text=True)
            last_result = result
            if result.returncode == 0:
                break
        else:
            raise RuntimeError(
                f"PSDReader failed:\nstdout: {last_result.stdout}\nstderr: {last_result.stderr}"
            )

        # Read the generated JSON
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        return data