import re
import xml.etree.ElementTree as ET
from pathlib import Path

from app.integrations.harmony.HarmonyConnector import HarmonyConnector


class HarmonyAnimaticImporter:
    """Imports the animatic video of a shot into a Harmony scene as a READ node.

    The import uses the same batch-mode strategy as :class:`HarmonyBGPreviewImporter`:

    * The JS script (`import_animatic.js`) runs Harmony in batch mode to:

      - create the element / column / READ node (creates a PLACEHOLDER),
      - extract all video frames to the element folder via ``MovieImport``.

    * Python post-processing (:meth:`set_node_transform`) then:

      - injects per-frame ``<elementSeq>`` exposure entries (``column.setEntry()``
        crashes in Harmony 25 batch mode),
      - replaces the PLACEHOLDER module with a proper READ module (same limitation
        as for BG_preview),
      - bakes the overlay scale and offset into the READ module XML.

    Parameters
    ----------
    scene_path:
        Absolute path to the target ``.xstage`` file.
    """

    def __init__(self, scene_path: Path) -> None:
        self.scene_path = Path(scene_path)
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
        """Extract video frames and create a READ node via Harmony batch mode.

        The actual frame-to-drawing mapping is injected into the xstage XML
        by :meth:`set_node_transform` (called immediately after by the
        orchestrator).

        Returns ``True`` on success; raises on failure.
        """
        self._last_layer_name = layer_name
        harmony = HarmonyConnector()
        harmony.run_script(
            str(self.scene_path),
            "import_animatic",
            {
                "video_path": video_path,
                "layer_name": layer_name,
            },
        )
        return True

    # ------------------------------------------------------------------
    # Transform / post-processing
    # ------------------------------------------------------------------

    def set_node_transform(
        self,
        node_name: str,
        scale_x: float,
        scale_y: float,
        position_x: float,
        position_y: float,
    ) -> bool:
        """Inject exposures and bake the overlay transform into the xstage XML.

        Called by the orchestrator immediately after :meth:`import_movie`.
        The scale and position are forwarded verbatim from
        ``AnimaticImportConfig`` (default: 33 % scale, top-right offset).
        """
        layer = node_name or self._last_layer_name or "animatique"
        _post_process_xstage(
            scene_path=self.scene_path,
            layer_name=layer,
            scale_x=scale_x,
            scale_y=scale_y,
            offset_x=position_x,
            offset_y=position_y,
        )
        return True


# ---------------------------------------------------------------------------
# Post-processing helpers (package-private)
# ---------------------------------------------------------------------------

def _post_process_xstage(
    scene_path: Path,
    layer_name: str,
    scale_x: float,
    scale_y: float,
    offset_x: float,
    offset_y: float,
) -> None:
    """Inject per-frame exposures and fix the PLACEHOLDER → READ module.

    Batch-mode constraints in Harmony 25 require three things to be done
    via direct XML manipulation rather than through the scripting API:

    1. **Exposures** — ``column.setEntry()`` crashes with ACCESS_VIOLATION.
       We inject one ``<elementSeq>`` per frame directly into the column XML.

    2. **Module type** — ``node.add("Top", "READ", …)`` always creates a
       PLACEHOLDER in batch mode.  We replace it with a proper READ module.

    3. **Overlay transform** — scale and offset are baked into the READ
       module XML so no separate peg node is required.
    """
    content = scene_path.read_text(encoding="utf-8")

    # --- Locate column → element → folder ---
    m_col = re.search(
        rf'<column\b(?=[^>]*\bname="{re.escape(layer_name)}")[^>]*\bid="(\d+)"',
        content,
    )
    if not m_col:
        raise RuntimeError(
            f"[Animatic] Column '{layer_name}' not found in xstage: {scene_path}"
        )
    col_id = m_col.group(1)

    m_elem_tag = re.search(
        rf'<element\b(?=[^>]*\bid="{col_id}")[^>]*/?>',
        content,
    )
    elem_name: str | None = None
    elem_folder: str | None = None
    if m_elem_tag:
        tag = m_elem_tag.group(0)
        m_name   = re.search(r'\belementName="([^"]+)"', tag)
        m_folder = re.search(r'\belementFolder="([^"]+)"', tag)
        if m_name:
            elem_name = m_name.group(1)
        if m_folder:
            elem_folder = m_folder.group(1)

    if not elem_name:
        raise RuntimeError(
            f"[Animatic] Cannot find elementName for column '{layer_name}' in xstage."
        )

    # --- Resolve element folder on disk ---
    # In Harmony batch mode, elementFolder in the xstage sometimes omits the
    # ".{id}" suffix even though the actual directory is named "{name}.{id}".
    # We prefer the canonical "{name}.{id}" form and fall back to elementFolder.
    elements_dir = scene_path.parent / "elements"
    canonical_folder = elements_dir / f"{elem_name}.{col_id}"
    fallback_folder  = elements_dir / elem_folder if elem_folder else None

    if canonical_folder.exists():
        element_dir = canonical_folder
    elif fallback_folder and fallback_folder.exists():
        element_dir = fallback_folder
    else:
        element_dir = canonical_folder  # will trigger the "no frames" error below

    frame_files = sorted(
        element_dir.glob(f"{elem_name}-*.png"),
        key=lambda p: _frame_number(p.stem, elem_name),
    )
    num_frames = len(frame_files)

    if num_frames == 0:
        raise RuntimeError(
            f"[Animatic] No PNG frames found in {element_dir}. "
            "MovieImport may not work in batch mode on this configuration."
        )

    # --- Inject per-frame exposures ---
    col_pattern = (
        rf'(<column\b[^>]*\bname="{re.escape(layer_name)}"[^>]*?)'
        r'(\s*/>|\s*>.*?</column>)'
    )

    def _replace_col(match: re.Match) -> str:
        opening_tag = match.group(1)
        m_id = re.search(r'\bid="(\d+)"', opening_tag)
        if not m_id:
            return match.group(0)
        eid = m_id.group(1)
        seq_lines = "\n".join(
            f'     <elementSeq val="{i}" id="{eid}"/>'
            for i in range(1, num_frames + 1)
        )
        return f"{opening_tag}>\n{seq_lines}\n    </column>"

    content = re.sub(col_pattern, _replace_col, content, flags=re.DOTALL)

    # --- Fix PLACEHOLDER → proper READ module with overlay transform ---
    placeholder_pat = (
        rf'<module\s+type="PLACEHOLDER"\s+name="{re.escape(layer_name)}"\s+'
        r'pos="([^"]*)"\s+publishUnderTab="READ"\s*/>'
    )
    m_ph = re.search(placeholder_pat, content)
    if m_ph:
        pos = m_ph.group(1)
        read_module = _build_read_module_xml(
            name=layer_name,
            pos=pos,
            scale_x=scale_x,
            scale_y=scale_y,
            offset_x=offset_x,
            offset_y=offset_y,
        )
        content = content[: m_ph.start()] + read_module + content[m_ph.end() :]

    scene_path.write_text(content, encoding="utf-8")


def _frame_number(stem: str, elem_name: str) -> int:
    """Return the frame number from a file stem like ``animatique-42``."""
    prefix = f"{elem_name}-"
    if stem.startswith(prefix):
        try:
            return int(stem[len(prefix):])
        except ValueError:
            pass
    return 0


def _build_read_module_xml(
    name: str,
    pos: str,
    scale_x: float,
    scale_y: float,
    offset_x: float,
    offset_y: float,
) -> str:
    """Return the full XML for a READ module with baked-in overlay transform.

    ``scale_x / scale_y`` reduce the drawing to a thumbnail size.
    ``offset_x / offset_y`` place it in the top-right area of the frame.
    ``extension="png"`` matches the PNG frames extracted by MovieImport.
    """
    return (
        f'<module type="READ" name="{name}" pos="{pos}" publishUnderTab="{name}">\n'
        f'      <options>\n'
        f'       <collapsed val="false"/>\n'
        f'       <version val="1"/>\n'
        f'      </options>\n'
        f'      <attrs>\n'
        f'       <enable3d val="false"/>\n'
        f'       <faceCamera val="false"/>\n'
        f'       <cameraAlignment val="NO_CAMERA_ALIGNMENT"/>\n'
        f'       <offset>\n'
        f'        <separate val="false"/>\n'
        f'        <x val="{offset_x}" defaultValue="0"/>\n'
        f'        <y val="{offset_y}" defaultValue="0"/>\n'
        f'        <z val="0" defaultValue="0"/>\n'
        f'       </offset>\n'
        f'       <scale>\n'
        f'        <separate val="true"/>\n'
        f'        <inFields val="false"/>\n'
        f'        <xy val="1" defaultValue="1"/>\n'
        f'        <x val="{scale_x}" defaultValue="1"/>\n'
        f'        <y val="{scale_y}" defaultValue="1"/>\n'
        f'        <z val="1" defaultValue="1"/>\n'
        f'       </scale>\n'
        f'       <rotation>\n'
        f'        <separate val="false"/>\n'
        f'        <anglex val="0" defaultValue="0"/>\n'
        f'        <angley val="0" defaultValue="0"/>\n'
        f'        <anglez val="0" defaultValue="0"/>\n'
        f'       </rotation>\n'
        f'       <angle val="0" defaultValue="0"/>\n'
        f'       <skew val="0" defaultValue="0"/>\n'
        f'       <pivot>\n'
        f'        <x val="0" defaultValue="0"/>\n'
        f'        <y val="0" defaultValue="0"/>\n'
        f'        <z val="0" defaultValue="0"/>\n'
        f'       </pivot>\n'
        f'       <splineOffset>\n'
        f'        <x val="0" defaultValue="0"/>\n'
        f'        <y val="0" defaultValue="0"/>\n'
        f'        <z val="0" defaultValue="0"/>\n'
        f'       </splineOffset>\n'
        f'       <ignoreParentPegScaling val="false"/>\n'
        f'       <disableFieldRendering val="false"/>\n'
        f'       <depth val="0"/>\n'
        f'       <enableMinMaxAngle val="false"/>\n'
        f'       <minAngle val="-360" defaultValue="-360"/>\n'
        f'       <maxAngle val="360" defaultValue="360"/>\n'
        f'       <nailForChildren val="false"/>\n'
        f'       <ikHoldOrientation val="false"/>\n'
        f'       <ikHoldX val="false"/>\n'
        f'       <ikHoldY val="false"/>\n'
        f'       <ikExcluded val="false"/>\n'
        f'       <ikCanRotate val="true"/>\n'
        f'       <ikCanTranslateX val="false"/>\n'
        f'       <ikCanTranslateY val="false"/>\n'
        f'       <ikBoneX val="0.20000000000000001" defaultValue="0.20000000000000001"/>\n'
        f'       <ikBoneY val="0" defaultValue="0"/>\n'
        f'       <ikStiffness val="1" defaultValue="1"/>\n'
        f'       <drawing>\n'
        f'        <elementMode val="true"/>\n'
        f'        <element col="{name}">\n'
        f'         <layer val=""/>\n'
        f'        </element>\n'
        f'        <customName>\n'
        f'         <name val=""/>\n'
        f'         <extension val="png"/>\n'
        f'         <fieldChart val="12" defaultValue="12"/>\n'
        f'        </customName>\n'
        f'       </drawing>\n'
        f'       <readOverlay val="true"/>\n'
        f'       <readLineArt val="true"/>\n'
        f'       <readColorArt val="true"/>\n'
        f'       <readUnderlay val="true"/>\n'
        f'       <overlayArtDrawingMode val="VectorDrawingMode"/>\n'
        f'       <lineArtDrawingMode val="VectorDrawingMode"/>\n'
        f'       <colorArtDrawingMode val="VectorDrawingMode"/>\n'
        f'       <underlayArtDrawingMode val="VectorDrawingMode"/>\n'
        f'       <pencilLineDeformationPreserveThickness val="false"/>\n'
        f'       <pencilLineDeformationQuality val="Low"/>\n'
        f'       <pencilLineDeformationSmooth val="1"/>\n'
        f'       <pencilLineDeformationFitError val="3" defaultValue="3"/>\n'
        f'       <readColor val="true"/>\n'
        f'       <readTransparency val="true"/>\n'
        f'       <colorTransformation val="Linear"/>\n'
        f'       <colorSpace val="sRGB"/>\n'
        f'       <applyMatteToColor val="N"/>\n'
        f'       <enableLineTexture val="true"/>\n'
        f'       <antialiasingQuality val="HIGH"/>\n'
        f'       <antialiasingExponent val="1" defaultValue="1"/>\n'
        f'       <opacity val="100" defaultValue="100"/>\n'
        f'       <textureFilter val="NEAREST_FILTERED"/>\n'
        f'       <adjustPencilThickness val="false"/>\n'
        f'       <normalLineArtThickness val="true"/>\n'
        f'       <zoomIndependentLineArtThickness val="zoomIndependent"/>\n'
        f'       <multLineArtThickness val="1" defaultValue="1"/>\n'
        f'       <addLineArtThickness val="0" defaultValue="0"/>\n'
        f'       <minLineArtThickness val="0" defaultValue="0"/>\n'
        f'       <maxLineArtThickness val="0" defaultValue="0"/>\n'
        f'       <useDrawingPivot val="APPLY_ON_READ_TRANSFORM"/>\n'
        f'       <flipHor val="false"/>\n'
        f'       <flipVert val="false"/>\n'
        f'       <turnBeforeAlignment val="false"/>\n'
        f'       <noClipping val="false"/>\n'
        f'       <xClipFactor val="0"/>\n'
        f'       <yClipFactor val="0"/>\n'
        f'       <alignmentRule val="CENTER_FIRST_PAGE"/>\n'
        f'       <morphingVelo val="0" defaultValue="0"/>\n'
        f'       <canAnimate val="true"/>\n'
        f'       <tileHorizontal val="false"/>\n'
        f'       <tileVertical val="false"/>\n'
        f'       <framerate val="-1" defaultValue="-1"/>\n'
        f'      </attrs>\n'
        f'     </module>'
    )


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

