import json
from pathlib import Path
import re
import os 
import uuid

class ProjectPaths():

    """
    """

    def __init__(self):
        ...

    # -------------------------
    # config.json lookup
    # -------------------------

    def get_project_folder(self, name: str) -> str | None:
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

        paths = data.get("project_paths", {})
        if name not in paths:
            available = list(paths.keys())
            raise KeyError(f"'{name}' not found in config paths (available: {available})")

        return paths[name]
    
    

    def resolve_path(self, path: str) -> str:
        """
        Replace every __KEYWORD__ token in *path* with the matching
        value from config.json > project_folders.
        Unresolved tokens emit a warning and are left in place.
        """
        
        _KEYWORD_RE = re.compile(r'__([A-Z0-9_]+)__')
        
        if not path:
            return path

        config_file = Path(__file__).parents[4] / "config" / "config.json"
        data = json.loads(config_file.read_text(encoding="utf-8"))
        folders: dict = data.get("project_folders", {})

        def _replace(match: re.Match) -> str:
            token = match.group(0)          # e.g.  __LIBRARY__
            key   = match.group(1)          # e.g.  LIBRARY
            # config key is stored as _LIBRARY_ (single underscores)
            config_key = f"_{key}_"
            if config_key in folders:
                return folders[config_key]
            print(f"resolve_path: no config entry for token '{token}' — left as-is.")
            return token

        return _KEYWORD_RE.sub(_replace, path)


    def resolve_dict_paths(self, data: dict) -> dict:
        """
        Deep-walk *data* and resolve __KEYWORD__ tokens in every string
        value whose key is 'path', 'absolute', or 'relative'.
        Returns a new dict (original is untouched).
        """
        _PATH_KEYS = {"path", "absolute", "relative"}

        def _walk(node):
            if isinstance(node, dict):
                return {
                    k: (self.resolve_path(v)
                        if k in _PATH_KEYS and isinstance(v, str)
                        else _walk(v))
                    for k, v in node.items()
                }
            if isinstance(node, list):
                return [_walk(item) for item in node]
            return node

        return _walk(data)


    def resolve_json_paths(self, json_path: str) -> str:
        """
        Load the JSON at *json_path*, resolve all path tokens, write a
        resolved copy to the system temp dir, and return its path.
        """
        import tempfile

        src = Path(json_path)
        if not src.is_file():
            raise FileNotFoundError(f"Schema not found: {json_path}")

        raw: dict = json.loads(src.read_text(encoding="utf-8"))
        resolved = self.resolve_dict_paths(raw)

        serial = str(uuid.uuid4())
        tmp_file = Path(os.getenv("TEMP")+"/"+serial+"_resolved.json")
        tmp_file.write_text(
            json.dumps(resolved, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        return str(tmp_file)

