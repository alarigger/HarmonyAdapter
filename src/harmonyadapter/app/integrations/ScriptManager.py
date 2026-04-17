from pathlib import Path
from dataclasses import dataclass
from typing import Optional, Dict, List, Union

@dataclass
class Script:
    path: Optional[Path] = None
    args: Optional[dict] = None

    def __str__(self) -> str:
        return (
            f"Script\n"
            f"  Path : {self.path or 'Not Set'}\n"
            f"  Args : {self.args or 'Not Set'}\n"
        )

class ScriptManager:

    def __init__(self, software: str, extensions: Union[str, List[str]] = "js"):
        self._software = software.lower()

        # Normalize to a list, accepting either a bare string ("js") or a list (["js", "py"]).
        # Leading dots are stripped so callers can pass either "js" or ".js" interchangeably.
        if isinstance(extensions, str):
            extensions = [extensions]
        self._extensions = [ext.lstrip(".") for ext in extensions]

        # Anchor the root to the directory that contains this file so that
        # relative sub-folder resolution works regardless of the working directory.
        self._root = Path(__file__).resolve().parent

        # Lazy-loaded cache: populated on the first call to load_all_scripts().
        self._scripts: Dict[str, Script] = {}

    def get_script(self, name: str, ext: str = None) -> Script:
        '''Retrieve a Script object by name, optionally filtered by extension.'''

        # Trigger lazy loading the first time a script is requested.
        if not self._scripts:
            self.load_all_scripts()

        if ext:
            # Normalize the requested extension and look for an exact name+ext match,
            # bypassing the first-extension-wins priority used during bulk loading.
            clean_ext = ext.lstrip(".")
            scripts_folder = self._root / self._software / "scripts"
            target = scripts_folder / f"{name}.{clean_ext}"

            if not target.exists():
                raise FileNotFoundError(f"Script not found: {name}.{clean_ext}")

            return Script(path=target)

        # No extension filter — use the cached result.
        if name not in self._scripts:
            raise FileNotFoundError(f"Script not found: {name}")

        return self._scripts[name]

    def load_all_scripts(self):
        '''Load all scripts in the software/scripts folder matching any extension'''
        scripts_folder = self._root / self._software / "scripts"
        if not scripts_folder.exists():
            raise FileNotFoundError(f"Scripts folder not found: {scripts_folder}")

        # Iterate over each registered extension and glob for matching files.
        for ext in self._extensions:
            for script_file in scripts_folder.glob(f"*.{ext}"):
                name = script_file.stem  # filename without extension, used as the lookup key

                # First-extension-wins: if the same stem already exists (e.g. "setup.js"
                # was found before "setup.py"), keep the earlier entry and skip the duplicate.
                if name not in self._scripts:
                    self._scripts[name] = Script(path=script_file)

    def list_scripts(self):
        '''Return a list of all loaded script names'''

        # Ensure the cache is populated before returning names.
        if not self._scripts:
            self.load_all_scripts()
        return list(self._scripts.keys())