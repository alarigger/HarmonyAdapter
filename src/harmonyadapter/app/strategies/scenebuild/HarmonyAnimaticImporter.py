import xml.etree.ElementTree as ET
from pathlib import Path

from app.integrations.harmony.HarmonyConnector import HarmonyConnector


class HarmonyAnimaticImporter:
    """Imports the animatic video of a shot into a Harmony scene as a READ node.

    Delegates all work to ``import_animatic.js`` via :class:`HarmonyConnector`
    running Harmony in UI mode (no -batch flag).

    Without -batch:
      - ``node.add("READ", ...)`` creates a proper READ module.
      - ``column.setEntry()`` works without ACCESS_VIOLATION.
      - ``node.link()`` wires the READ to the Composite.
      - ``node.setTextAttr()`` bakes in the overlay transform.

    The call is deferred to :meth:`set_node_transform` so that Python can
    pass scale / offset args computed by the orchestrator before Harmony opens.

    Parameters
    ----------
    scene_path:
        Absolute path to the target ``.xstage`` file.
    """

    def __init__(self, scene_path: Path) -> None:
        self.scene_path = Path(scene_path)
        self._pending_video_path: str | None = None
        self._last_layer_name: str | None = None

    # ------------------------------------------------------------------
    # FPS
    # ------------------------------------------------------------------

    def get_scene_fps(self) -> float:
        """Return the frame rate of the scene from the xstage XML (default 25.0)."""
        try:
            return _read_fps_from_xstage(self.scene_path)
        except Exception:
            return 25.0

    # ------------------------------------------------------------------
    # Video import (called by import_current_shot_animatic orchestrator)
    # ------------------------------------------------------------------

    def import_movie(self, video_path: str, layer_name: str) -> bool:
        """Store the video path for the deferred Harmony call.

        The actual Harmony import is triggered by :meth:`set_node_transform`,
        which receives the scale / offset args computed by the orchestrator.

        Returns ``True`` immediately.
        """
        self._pending_video_path = video_path
        self._last_layer_name = layer_name
        return True

    # ------------------------------------------------------------------
    # Transform â€” triggers the Harmony call with all combined args
    # ------------------------------------------------------------------

    def set_node_transform(
        self,
        node_name: str,
        scale_x: float,
        scale_y: float,
        position_x: float,
        position_y: float,
    ) -> bool:
        """Launch Harmony to import the video and apply the overlay transform.

        Called by the orchestrator immediately after :meth:`import_movie`.
        The scale and position are forwarded verbatim from
        ``AnimaticImportConfig`` (default: 33 % scale, top-right offset).

        The JS script handles everything:
          - frame extraction via MovieImport,
          - per-frame exposures via column.setEntry(),
          - transform via node.setTextAttr(),
          - Composite wiring via node.link().
        """
        layer = node_name or self._last_layer_name or "animatique"
        harmony = HarmonyConnector()
        harmony.run_script_ui(
            str(self.scene_path),
            "import_animatic",
            {
                "video_path": str(self._pending_video_path),
                "layer_name": layer,
                "scale_x":   scale_x,
                "scale_y":   scale_y,
                "offset_x":  position_x,
                "offset_y":  position_y,
            },
        )
        return True


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _read_fps_from_xstage(scene_path: Path) -> float:
    """Parse *scene_path* XML and return the frame rate as a float."""
    tree = ET.parse(str(scene_path))
    root = tree.getroot()

    for attr_name in ("fps", "frame-rate", "frameRate", "FPS"):
        val = root.get(attr_name)
        if val is not None:
            return float(val)

    for tag in ("fps", "FPS", "frame-rate", "frameRate", "framerate"):
        elem = root.find(f".//{tag}")
        if elem is not None and elem.text:
            return float(elem.text.strip())

    for xpath in (
        "./parameters/fps",
        "./settings/fps",
        ".//parameters/FPS",
        ".//settings/FPS",
    ):
        elem = root.find(xpath)
        if elem is not None and elem.text:
            return float(elem.text.strip())

    raise ValueError(f"Frame rate not found in xstage: {scene_path}")

