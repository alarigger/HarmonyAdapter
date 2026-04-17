from .Context import Context
from dataclasses import dataclass,field
from typing import Optional, Tuple, List
 
from __future__ import annotations
 
import json
import logging
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional
 
log = logging.getLogger(__name__)


# WIP !! 


# ---------------------------------------------------------------------------
# Leaf classes
# ---------------------------------------------------------------------------
 
@dataclass(frozen=True)
class AssetFile:
    type: Optional[str] = None          # e.g. "TPL", "PSD"
    role: Optional[str] = None          # e.g. "rig", "reference"
    absolute_path: Optional[str] = None
    relative_path: Optional[str] = None
 
 
@dataclass(frozen=True)
class Asset:
    id: Optional[int] = None
    name: Optional[str] = None
    type: Optional[str] = None          # "Character" | "Prop" | "Background"
    sub_type: Optional[str] = None      # "mainpack" | "secondary"
    files: tuple[AssetFile, ...] = ()   # tuple keeps frozen semantics
 
 
@dataclass(frozen=True)
class Casting:
    assets: tuple[Asset, ...] = ()
 
 
@dataclass(frozen=True)
class TemplatePath:
    absolute: Optional[str] = None
    relative: Optional[str] = None
 
 
@dataclass(frozen=True)
class Template:
    name: Optional[str] = None
    path: TemplatePath = TemplatePath()

# ---------------------------------------------------------------------------
# Top-level request
# ---------------------------------------------------------------------------
 
@dataclass(frozen=True)
class SceneBuild:
    """
    Fully resolved, immutable scene-build request.
    Built by HarmonyAdapterRequestFactory.parse_from_json().
    """
    input_scene: Optional[str] = None   # path to an existing .xstage, if any
    context: Context = Context()
    casting: Casting = Casting()
    template: Template = Template()
 
def _warn(msg: str) -> None:
    """Emit a warning and log it."""
    warnings.warn(msg, stacklevel=3)
    log.warning(msg)
 

# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------
 
class SceneBuildFactory():
    
    def parse_from_json(self, json_path: str) -> SceneBuild:
        """
        Load *json_path*, validate leniently, and return a SceneBuild.
 
        Parameters
        ----------
        json_path:
            Absolute or relative path to the scene-build JSON schema.
        """
        path = Path(json_path)
        if not path.exists():
            raise FileNotFoundError(f"Schema not found: {json_path}")
 
        with path.open("r", encoding="utf-8") as fh:
            raw: dict = json.load(fh)
 
        return SceneBuild(
            input_scene=self._parse_input_scene(raw),
            context=self._parse_context(raw.get("context") or {}),
            casting=self._parse_casting(raw.get("casting") or {}),
            template=self._parse_template(raw.get("template") or {}),
        )
 
    # ------------------------------------------------------------------
    # Section parsers
    # ------------------------------------------------------------------
 
    def _parse_input_scene(self, raw: dict) -> Optional[str]:
        """Optional top-level input scene path."""
        return raw.get("input_scene") or None
 
    # --- Context -------------------------------------------------------
 
    def _parse_context(self, data: dict) -> Context:
        _EXPECTED = {
            "project", "task_name", "task_id",
            "season", "episode", "sequence", "shot", "cut_duration",
        }
        self._warn_unknown(data, _EXPECTED, section="context")
 
        return Context(
            project=data.get("project"),
            task_name=data.get("task_name"),
            task_id=self._coerce_int(data.get("task_id"), "context.task_id"),
            season=data.get("season"),
            episode=data.get("episode"),
            sequence=data.get("sequence"),
            shot=data.get("shot"),
            cut_duration=self._coerce_int(
                data.get("cut_duration"), "context.cut_duration"
            ),
        )
 
    # --- Template ------------------------------------------------------
 
    def _parse_template(self, data: dict) -> Template:
        path_data = data.get("path") or {}
        return Template(
            name=data.get("name"),
            path=TemplatePath(
                absolute=path_data.get("absolute") or None,
                relative=path_data.get("relative") or None,
            ),
        )
 
    # --- Casting / Assets ----------------------------------------------
 
    def _parse_casting(self, data: dict) -> Casting:
        raw_assets = data.get("assets")
        if raw_assets is None:
            _warn("casting.assets is missing — casting will be empty.")
            return Casting()
 
        if not isinstance(raw_assets, list):
            _warn("casting.assets is not a list — casting will be empty.")
            return Casting()
 
        assets = tuple(
            self._parse_asset(a, idx) for idx, a in enumerate(raw_assets)
        )
        return Casting(assets=assets)
 
    def _parse_asset(self, data: dict, idx: int) -> Asset:
        _EXPECTED = {"id", "name", "type", "subType", "files"}
        self._warn_unknown(data, _EXPECTED, section=f"casting.assets[{idx}]")
 
        if not data.get("name"):
            _warn(f"casting.assets[{idx}] has no 'name' field.")
 
        raw_files = data.get("files") or []
        if not isinstance(raw_files, list):
            _warn(
                f"casting.assets[{idx}].files is not a list — files will be empty."
            )
            raw_files = []
 
        files = tuple(
            self._parse_asset_file(f, idx, f_idx)
            for f_idx, f in enumerate(raw_files)
        )
 
        return Asset(
            id=self._coerce_int(data.get("id"), f"casting.assets[{idx}].id"),
            name=data.get("name"),
            type=data.get("type"),
            sub_type=data.get("subType"),   # JSON key is camelCase
            files=files,
        )
 
    def _parse_asset_file(
        self, data: dict, asset_idx: int, file_idx: int
    ) -> AssetFile:
        section = f"casting.assets[{asset_idx}].files[{file_idx}]"
        _EXPECTED = {"type", "role", "path"}
        self._warn_unknown(data, _EXPECTED, section=section)
 
        path_data = data.get("path") or {}
        if not path_data:
            _warn(f"{section} has no 'path' block.")
 
        return AssetFile(
            type=data.get("type"),
            role=data.get("role"),
            absolute_path=path_data.get("absolute") or None,
            relative_path=path_data.get("relative") or None,
        )
 
    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
 
    @staticmethod
    def _coerce_int(value, field_name: str) -> Optional[int]:
        if value is None:
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            _warn(f"{field_name}: expected int, got {value!r} — defaulting to None.")
            return None
 
    @staticmethod
    def _warn_unknown(data: dict, expected: set, section: str) -> None:
        unknown = set(data.keys()) - expected
        if unknown:
            _warn(
                f"{section}: unexpected keys {sorted(unknown)} — they will be ignored."
            )