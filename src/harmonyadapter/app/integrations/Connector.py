import json
from pathlib import Path
from app.integrations.ScriptManager import ScriptManager, Script
from typing import List, Union
import subprocess


class Connector():

    """
    Base connector for external software.
    Loads executable path + provides automatic script lookup.
    Helper for wrapper classes to communicate with external non-Python software (e.g. Harmony, Blender).

    Expected config.json structure:
        {
            "connector_paths": {
                "harmony":    "my/path/to/soft.exe",
                "photoshop":  "my/path/to/soft.exe",
                "blender":    "my/path/to/soft.exe",
                "tvpaint":    "my/path/to/soft.exe",
                "psdreader":  "my/path/to/soft.bat"
            }
        }
    """

    def __init__(self, name: str = None, extensions: Union[str, List[str]] = "js"):

        self._name = name.lower() if name else None

        # Normalize extensions to a clean list (strip leading dots, wrap bare string in list).
        # Stored so subclasses can inspect which extensions this connector supports.
        if isinstance(extensions, str):
            extensions = [extensions]
        self._extensions = [ext.lstrip(".") for ext in extensions]

        # Resolve the software executable from config.json.
        self._main_path = self._find_main_path(self._name)

        # Anchor root to the folder containing this file so sub-folder
        # resolution is independent of the caller's working directory.
        self._root = Path(__file__).resolve().parent

        # ScriptManager handles discovery and caching of all scripts
        # for this software across all registered extensions.
        self._script_manager = ScriptManager(name, self._extensions)

    # -------------------------
    # config.json lookup
    # -------------------------

    def _find_main_path(self, name: str) -> str | None:
        """Retrieve the executable path for *name* from config.json."""

        if not name:
            return None

        config_file = Path(__file__).parents[4] / "config" / "config.json"

        if not config_file.is_file():
            raise FileNotFoundError(f"Missing config.json at expected location: {config_file}")

        try:
            data = json.loads(config_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse config.json: {e}")

        paths = data.get("connector_paths", {})
        if name not in paths:
            available = list(paths.keys())
            raise KeyError(f"'{name}' not found in config paths (available: {available})")

        return paths[name]

    # -------------------------
    # integrated script finder
    # -------------------------

    def script(self, name: str,ext:str=None) -> Script:
        """
        Return a Script object by stem name, resolved from:

            <software>/scripts/<name>.<ext>

        Extension priority follows the order passed to the constructor.
        Raises FileNotFoundError if no matching script is found.
        """
        return self._script_manager.get_script(name,ext)

    def list_scripts(self) -> list:
        """Return all script names available for this connector."""
        return self._script_manager.list_scripts()

    # -------------------------
    # shell helpers
    # -------------------------

    @staticmethod
    def _quote(path: str) -> str:
        """Windows-safe quoting for subprocess / os.system() calls."""
        return subprocess.list2cmdline([str(path)])