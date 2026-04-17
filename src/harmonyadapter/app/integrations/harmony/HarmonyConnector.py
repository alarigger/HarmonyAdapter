import json
import os
import shutil
from pathlib import Path

from app.integrations.Connector import Connector


class HarmonyConnector(Connector):

    # Default render output relative to the scene folder.
    _RENDER_SUBPATH = ("frames", "output.mov")

    def __init__(self):
        # Register both the JS scripts (Harmony scripts) and the bat launcher.
        super().__init__("harmony", extensions=["js", "bat"])

    # -------------------------
    # Script execution
    # -------------------------

    def run_script(self, scene_path: str, script_name: str, args: dict | None = None):
        """Run a named Harmony JS script against a scene in batch mode."""

        script  = self.script(script_name)
        launcher = self.script("launcher", ext="bat")

        # Expose runtime paths to the bat/js layer via environment variables.
        script_dir = Path(script.path).parent
        app_root   = Path(script.path).parents[6]

        os.environ["HARMONY_WRAPPER_SCRIPT_FOLDER"] = str(script_dir)
        os.environ["APP_LIB_FOLDER"]                = str(app_root / "lib")
        os.environ["APP_TEST_FOLDER"]               = str(app_root / "tests")
        os.environ["HARMONY_WRAPPER_ARGS"]          = self._serialise_args(args or {})

        # Args match launcher.bat: <harmony_exe> <scene_path> <script_path>
        cmd = " ".join([
            self._quote(launcher.path),
            self._quote(self._main_path),
            self._quote(scene_path),
            self._quote(script.path),
        ])

        print(f"[HarmonyConnector] Running: {cmd}")
        os.system(cmd)

    # -------------------------
    # Rendering
    # -------------------------

    def render(self, scene_path: str, output_path: str | None = None) -> str | None:
        """
        Render a Harmony scene in batch mode.

        Returns the path to the output video - either the default Harmony
        render location, or *output_path* if one was provided.
        Returns None if no output file is found after rendering.
        """

        launcher = self.script("render", ext="bat")

        # Args match render.bat: <harmony_exe> <scene_path>
        cmd = " ".join([
            self._quote(launcher.path),
            self._quote(str(self._main_path)),
            self._quote(scene_path),
        ])

        print(f"[HarmonyConnector] Rendering: {cmd}")
        os.system(cmd)

        # Harmony always writes its output relative to the scene folder.
        default_output = Path(scene_path).parent.joinpath(*self._RENDER_SUBPATH)

        if not default_output.exists():
            print("[HarmonyConnector] Render finished but no output video found.")
            return None

        if not output_path:
            return str(default_output)

        # Copy to the requested destination, creating any missing directories.
        destination = Path(output_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(default_output, destination)
        print(f"[HarmonyConnector] Copied render to: {destination}")

        return str(destination)

    # -------------------------
    # Helpers
    # -------------------------

    def _serialise_args(self, args: dict) -> str:
        """Serialise a dict to a JSON string for HARMONY_WRAPPER_ARGS."""
        return json.dumps(args)