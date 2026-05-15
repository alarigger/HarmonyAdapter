from __future__ import annotations

import math
import re
from pathlib import Path
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from miyu.claudy.scene_builder.bg_cadre_extractor import BGCadreResult


class HarmonyBGPreviewImporter:
    """Concrete implementation of the BGPreviewImporter protocol for Harmony.

    Satisfies the Protocol defined in
    ``miyu.claudy.scene_builder.bg_preview_import.BGPreviewImporter``.

    Delegates the entire import to the ``import_bg_preview`` JS script via
    :class:`HarmonyConnector` running Harmony in batch mode (-batch -compile).

    In batch mode:
      - ``node.add("READ", ...)`` creates a proper READ module.
      - ``Drawing.create()`` + ``QFile`` work for the JPG copy.
      - ``column.setEntry()`` causes ACCESS_VIOLATION → not used.
      - Harmony exits automatically when the script ends (no System.exit needed).

    Python computes the camera-fit transform (Option A) and passes it as
    JSON args; the JS script applies it via ``node.setTextAttr()``.
    """

    def import_jpg_as_bg(
        self,
        jpg_path: Path,
        scene_path: Path,
        layer_name: str = "BG_preview",
        cadre: Optional[BGCadreResult] = None,
    ) -> None:
        """Import *jpg_path* as a raster BG layer in *scene_path*.

        When *cadre* is provided (Option C), the INFO-ATC cadre bounding box
        from the source BGL PSD is used to compute a pixel-perfect offset and
        scale so that the cadre region aligns with the camera viewport —
        regardless of whether the BG has overscan or camera pan.

        When *cadre* is ``None`` (Option A / fallback), the whole JPG is
        treated as the camera frame (1 file = 1 shot, no sub-crop).

        The xstage XML is read ONLY here (no writing). The actual import is
        delegated to ``import_bg_preview.js`` via batch-mode Harmony.
        """
        from app.integrations.harmony.HarmonyConnector import HarmonyConnector  # noqa: PLC0415
        harmony = HarmonyConnector()

        transform: dict = {}
        try:
            content = Path(scene_path).read_text(encoding="utf-8")
            _cam_x, _cam_y, _cam_z = _read_static_camera_position(content)

            if cadre is not None:
                # Option C — pixel-perfect cadre from PSD INFO-ATC.
                transform = _calculate_camera_fit_transform_from_cadre(
                    cadre=cadre,
                    cam_x=_cam_x,
                    cam_y=_cam_y,
                    cam_z=_cam_z,
                )
            else:
                # Option A — full JPG treated as the camera frame.
                from PIL import Image as _PIL_Image  # type: ignore[import]
                with _PIL_Image.open(jpg_path) as _img:
                    _w, _h = _img.size
                transform = _calculate_camera_fit_transform(
                    jpg_w=_w,
                    jpg_h=_h,
                    cam_x=_cam_x,
                    cam_y=_cam_y,
                    cam_z=_cam_z,
                )
        except Exception:
            pass  # fallback: flat import (no transform)

        args = {
            "jpg_path":  str(jpg_path),
            "layer_name": layer_name,
            **transform,  # offset_x, offset_y, scale_x, scale_y (ou vide)
        }
        harmony.run_script(str(scene_path), "import_bg_preview", args)

        # Post-processing: in batch mode node.add("READ") creates a PLACEHOLDER.
        # Patch the xstage XML to replace it with a proper READ module.
        try:
            _patch_placeholder_to_read_node(
                xstage_path=Path(scene_path),
                layer_name=layer_name,
                offset_x=transform.get("offset_x", 0.0),
                offset_y=transform.get("offset_y", 0.0),
                scale_x=transform.get("scale_x", 1.0),
                scale_y=transform.get("scale_y", 1.0),
            )
        except Exception:
            pass  # best-effort: PLACEHOLDER still works, just without transform

    @classmethod
    def _post_process_xstage(
        cls,
        xstage_path: Path,
        jpg_path: Path,
        layer_name: str,
    ) -> None:
        """Post-process the xstage after a scene build to fix PLACEHOLDER nodes.

        Called by SceneBuildRunner after Harmony exits in batch mode.

        In the full scene build path (build_scene.js), the JS already creates
        proper READ nodes and copies the JPG — so this is mostly a no-op.
        For edge cases where only a PLACEHOLDER was written, the patch is
        applied with a flat/identity transform (offset 0,0 / scale 1,1).
        The column exposure entries are also added if missing (self-closing tag).
        """
        _patch_placeholder_to_read_node(
            xstage_path=xstage_path,
            layer_name=layer_name,
            offset_x=0.0,
            offset_y=0.0,
            scale_x=1.0,
            scale_y=1.0,
        )


def _read_static_camera_position(content: str) -> tuple[float, float, float]:
    """Extract the camera PEG static position from xstage XML.

    Strategy:
    1. Find the ``<module type="CAMERA">`` to get the camera node name.
    2. Find its parent PEG via ``<link out="..." in="{camera_name}">``.
    3. Fallback: try known PEG names (``Camera-P``, ``Camera_Peg``, ``Camera-Peg``).
    4. Read the ``<position>`` block (PEG nodes), fallback to ``<offset>``.

    Only returns actual values for static axes (no ``col=`` attribute).
    Animated axes fall back to ``0.0``.

    Returns ``(x, y, z)`` in Toonboom/Harmony units.  Returns ``(0.0, 0.0, 0.0)``
    when the camera module is absent or uses animated columns.
    """
    # Step 1+2: find the PEG connected to the CAMERA module via a scene link
    cam_peg_name: str | None = None
    m_cam = re.search(
        r'<module\b[^>]*\btype="CAMERA"[^>]*\bname="([^"]+)"', content
    )
    if m_cam:
        camera_name = m_cam.group(1)
        m_link = re.search(
            rf'<link\b[^>]*\bout="([^"]+)"[^>]*\bin="{re.escape(camera_name)}"',
            content,
        )
        if m_link:
            cam_peg_name = m_link.group(1)

    # Step 3: fallback to well-known PEG names
    if not cam_peg_name:
        for _name in ("Camera-P", "Camera_Peg", "Camera-Peg"):
            if f'name="{_name}"' in content:
                cam_peg_name = _name
                break

    if not cam_peg_name:
        return 0.0, 0.0, 0.0

    m_module = re.search(
        rf'<module\b[^>]*\btype="PEG"[^>]*\bname="{re.escape(cam_peg_name)}"[^>]*>.*?</module>',
        content,
        re.DOTALL,
    )
    if not m_module:
        return 0.0, 0.0, 0.0

    module_xml = m_module.group(0)
    # PEG nodes store position in <position>; READ nodes use <offset>.
    # We try <position> first, then fall back to <offset> for older scenes.
    m_pos = re.search(r'<position>(.*?)</position>', module_xml, re.DOTALL)
    if not m_pos:
        m_pos = re.search(r'<offset>(.*?)</offset>', module_xml, re.DOTALL)
    if not m_pos:
        return 0.0, 0.0, 0.0

    pos_xml = m_pos.group(1)

    def _read_axis(tag: str) -> float:
        """Return the static value for axis *tag* (x/y/z), or 0.0 if animated."""
        m_el = re.search(rf'<{re.escape(tag)}\s([^/]*/?>)', pos_xml)
        if not m_el:
            return 0.0
        attrs = m_el.group(1)
        if 'col=' in attrs:  # animated column → value unknowable statically
            return 0.0
        m_val = re.search(r'\bval="([^"]+)"', attrs)
        if not m_val:
            return 0.0
        try:
            return float(m_val.group(1))
        except ValueError:
            return 0.0

    return _read_axis("x"), _read_axis("y"), _read_axis("z")


def _calculate_camera_fit_transform(
    jpg_w: int,
    jpg_h: int,
    cam_x: float = 0.0,
    cam_y: float = 0.0,
    cam_z: float = 0.0,
) -> dict:
    """Calculate READ offset + scale to align a JPG with the camera (Option A).

    Uses the full JPG as the cadre (frame.x=0, frame.y=0, frame.w=jpg_w,
    frame.h=jpg_h) — i.e. "1 shot = 1 image", no sub-crop.

    This is a Python port of ``CadreFitter._calculate_bg_coords`` (cadre_fitter.js),
    with the simplification that cadre == background (so cadre_x=0, cadre_y=0).

    Returns a dict with keys ``offset_x, offset_y, scale_x, scale_y``,
    suitable for spreading into the ``import_bg_preview`` JS script args.

    TODO (Option C): When the BG PSD is available (via MiyuBGPsdResolver +
    BGCadreExtractor), the real INFO-ATC cadre should be passed here instead of
    using the full JPG dimensions.  That will give pixel-perfect alignment for
    shots with camera pan / zoom.
    """
    # Toonboom coordinate constants — verified against CadreFitter + camera.js
    TB_HALF_W: float = 15.8704   # Toonboom units for half camera width at z=0
    TB_HALF_H: float = 12.1611   # idem for half camera height
    CAM_W_PX:  float = 1920.0
    CAM_H_PX:  float = 1080.0

    # fieldChart=12 : Harmony CENTER_FIRST_PAGE auto-scale le dessin pour que
    # sa hauteur = 12 fields = TB_HALF_H*2 TB units.
    # On travaille directement en TB units — pas besoin de passer par les pixels.
    fields_tb_h = TB_HALF_H * 2  # hauteur d'un cadre 12-fields en TB units

    if cam_z != 0.0:
        # Zoom actif : facteur d'agrandissement du viewport à ce z.
        # Harmony a un système de coordonnées NON-CARRÉ : TB_x ≠ TB_y en pixels.
        # Le facteur de zoom correct est le ratio WIDTH en TB_x_units,
        # conforme à CadreFitter.js : z_ratio = pixel_width / cam_w
        #                            = rendered_tb_w / (TB_HALF_W*2).
        # Utiliser rendered_tb_h/(TB_HALF_H*2) donne un résultat différent car
        # x_ratio ≠ y_ratio dans le système non-carré.
        TB_FOV_DEG = 106.0  # 53° demi-FOV × 2, calibré pour FOV de scène ≈ 41°
        half_rad      = math.radians(TB_FOV_DEG / 2)
        rendered_tb_w = ((math.tan(half_rad) * cam_z) + TB_HALF_W) * 2
        final_sx = rendered_tb_w / (TB_HALF_W * 2)
        final_sy = final_sx
    else:
        final_sx = 1.0
        final_sy = 1.0

    # Garde-fous sur le scale avant de l'utiliser en division.
    if not math.isfinite(final_sx) or final_sx <= 0:
        final_sx = 1.0
    if not math.isfinite(final_sy) or final_sy <= 0:
        final_sy = 1.0

    # Offset : avec un PEG parent (cf. _patch_placeholder_to_read_node), la
    # translation est portée par le PEG. Le READ reste centré à l'origine.
    final_x = cam_x
    final_y = cam_y

    if not math.isfinite(final_x):
        final_x = 0.0
    if not math.isfinite(final_y):
        final_y = 0.0

    return {
        "offset_x": round(final_x, 6),
        "offset_y": round(final_y, 6),
        "scale_x":  round(final_sx, 6),
        "scale_y":  round(final_sy, 6),
    }


def _calculate_camera_fit_transform_from_cadre(
    cadre: BGCadreResult,
    cam_x: float = 0.0,
    cam_y: float = 0.0,
    cam_z: float = 0.0,
) -> dict:
    """Compute READ offset + scale so the INFO-ATC cadre aligns with the camera.

    Option C — uses the real camera frame extracted from the BGL PSD
    (INFO-ATC group) instead of assuming the full JPG equals the frame.

    Geometry (all computed in Harmony TB units — non-square coordinate system)
    --------------------------------------------------------------------------
    After fieldChart=12 import, the BG image is centered at (0, 0) in Harmony.
    Any pixel ``(px_x, px_y)`` in the BG maps to Harmony TB position::

        tb_x =  (px_x - bg_width  / 2) * px_to_tb_x
        tb_y = -(px_y - bg_height / 2) * px_to_tb_y   # Y-axis flip

    where::

        px_to_tb_x = (TB_HALF_W * 2) / CAM_W_PX
        px_to_tb_y = (TB_HALF_H * 2) / CAM_H_PX

    These are DIFFERENT values (non-square system — do not normalise to square).

    The READ node transform is ``world = scale * (drawing_point + offset)`` (SRT
    order). Setting the cadre centre at the camera position ``(cam_x, cam_y)``
    gives::

        offset = cam / scale - delta_tb

    Scale
    -----
    At Z=0, scale = ``CAM_H_PX / cadre.cadre_height`` (= 1 when the cadre
    exactly matches the scene resolution, which is the common case for
    overscan BGs where the cadre is already 1920×1080 inside a 3840×2160 BG).
    Camera zoom (``cam_z ≠ 0``) multiplies the scale by the viewport-expansion
    ratio, identical to the Option A zoom correction.
    """
    # Toonboom coordinate constants (verified against CadreFitter + camera.js)
    TB_HALF_W: float = 15.8704
    TB_HALF_H: float = 12.1611
    CAM_W_PX:  float = 1920.0
    CAM_H_PX:  float = 1080.0

    # Pixel → TB conversion based on actual BG dimensions.
    # With fieldChart=12 + CENTER_FIRST_PAGE, the full BG height maps to
    # TB_FULL_H TB units regardless of pixel resolution.  Using the BG
    # dimensions here (not the camera resolution) is critical for BGs that
    # are not 1920×1080.
    px_to_tb_x = (TB_HALF_W * 2) / cadre.bg_width
    px_to_tb_y = (TB_HALF_H * 2) / cadre.bg_height

    # Cadre centre position in PSD pixels
    cadre_cx = cadre.cadre_x + cadre.cadre_width  / 2.0
    cadre_cy = cadre.cadre_y + cadre.cadre_height / 2.0

    # Cadre centre relative to BG centre, converted to TB units.
    # Y-axis is flipped: PSD Y+ = downward, Harmony Y+ = upward.
    delta_x_tb = (cadre_cx - cadre.bg_width  / 2.0) * px_to_tb_x
    delta_y_tb = -(cadre_cy - cadre.bg_height / 2.0) * px_to_tb_y

    # Base scale: map cadre height → camera viewport height.
    # = (viewport_h_tb) / (cadre_h * px_to_tb_y)
    # = (TB_FULL_H) / (cadre_h * TB_FULL_H / bg_h)
    # = bg_h / cadre_h
    # Equivalent to: (CAM_W_PX / cadre_w) * (bg_h / CAM_H_PX) for 16:9 cadres
    # (matches cadre_fitter.js: final_ratio * reverse_import_scale)
    viewport_h_tb = TB_HALF_H * 2
    cadre_h_tb = cadre.cadre_height * px_to_tb_y
    scale = viewport_h_tb / cadre_h_tb  # = bg_h / cadre_h

    # Zoom correction: camera pulled back enlarges the viewport in TB space.
    # Use the WIDTH ratio (TB_x_units), matching CadreFitter.js:
    #   z_ratio = pixel_width / cadre_w = rendered_tb_w / (TB_HALF_W*2)
    # (for cadre_w == CAM_W_PX == 1920, which is the standard Claudy cadre)
    # NOTE: rendered_tb_h / (TB_HALF_H*2) gives a DIFFERENT (wrong) result
    # because the Harmony coordinate system is non-square (TB_x ≠ TB_y).
    if cam_z != 0.0:
        TB_FOV_DEG = 106.0  # 53° half-FOV × 2, calibré pour FOV de scène ≈ 41°
        half_rad      = math.radians(TB_FOV_DEG / 2)
        rendered_tb_w = ((math.tan(half_rad) * cam_z) + TB_HALF_W) * 2
        scale *= rendered_tb_w / (TB_HALF_W * 2)

    # Safety guard on scale before using it for division.
    if not math.isfinite(scale) or scale <= 0:
        scale = 1.0

    # Offset (PEG parent): cadre centre must land at (cam_x, cam_y) after READ scale.
    # World = peg_pos + drawing_point * read_scale  -> peg_pos = cam - delta_tb * scale
    final_x = cam_x - delta_x_tb * scale
    final_y = cam_y - delta_y_tb * scale

    if not math.isfinite(final_x):
        final_x = 0.0
    if not math.isfinite(final_y):
        final_y = 0.0

    return {
        "offset_x": round(final_x, 6),
        "offset_y": round(final_y, 6),
        "scale_x":  round(scale, 6),
        "scale_y":  round(scale, 6),
    }


def _patch_placeholder_to_read_node(
    xstage_path: Path,
    layer_name: str,
    offset_x: float,
    offset_y: float,
    scale_x: float,
    scale_y: float,
) -> None:
    """Replace a PLACEHOLDER module with a proper READ module in the xstage XML.

    In Harmony batch mode, ``node.add("READ", ...)`` creates a PLACEHOLDER.
    This function post-processes the saved xstage to turn that PLACEHOLDER
    into a PEG + READ pair with the correct static transform.

    The replacement uses the column name *layer_name* as the ``col`` reference
    for the drawing element — Harmony resolves column references by name when
    no ATV-... attribute ID column is present.
    """
    if not xstage_path.exists():
        return

    content = xstage_path.read_text(encoding="utf-8")

    import re as _re

    # --- 1. Patch column: add drawing exposure so the image appears on timeline ---
    # Parse scene frame range
    scene_range_m = _re.search(r'startFrame="(\d+)" stopFrame="(\d+)"', content)
    start_frame = int(scene_range_m.group(1)) if scene_range_m else 1
    stop_frame = int(scene_range_m.group(2)) if scene_range_m else 1

    col_pattern = _re.compile(
        rf'(\s*)(<column type="0" name="{_re.escape(layer_name)}"[^>]* id="(\d+)"/>)'
    )
    col_m = col_pattern.search(content)
    if col_m:
        col_indent = col_m.group(1)
        col_elem_id = col_m.group(3)
        expanded_col = (
            f'{col_indent}<column type="0" name="{layer_name}"'
            f' displayOrder="0" width="100" anonymous="true" id="{col_elem_id}">\n'
            f'{col_indent} <elementSeq exposures="{start_frame}-{stop_frame}"'
            f' val="1" id="{col_elem_id}"/>\n'
            f'{col_indent}</column>'
        )
        content = content[:col_m.start()] + expanded_col + content[col_m.end():]

    # --- 2. Patch module: replace PLACEHOLDER with PEG + READ child ---
    placeholder_pattern = _re.compile(
        rf'(\s*)<module type="PLACEHOLDER" name="{_re.escape(layer_name)}"[^/]*/>'
    )
    m = placeholder_pattern.search(content)
    if not m:
        xstage_path.write_text(content, encoding="utf-8")  # save column patch
        return

    indent = m.group(1)   # leading whitespace (e.g. "     " = 5 spaces)
    i1 = indent + " "     # +1 space
    i2 = indent + "  "    # +2 spaces
    i3 = indent + "   "   # +3 spaces

    peg_name = f"{layer_name}_PEG"

    peg_xml = (
        f'{indent}<module type="PEG" name="{peg_name}" pos="0,0,0"'
        f' publishUnderTab="{layer_name}">\n'
        f'{i1}<options>\n'
        f'{i2}<collapsed val="false"/>\n'
        f'{i2}<version val="1"/>\n'
        f'{i1}</options>\n'
        f'{i1}<attrs>\n'
        f'{i2}<enable3d val="false"/>\n'
        f'{i2}<faceCamera val="false"/>\n'
        f'{i2}<cameraAlignment val="NO_CAMERA_ALIGNMENT"/>\n'
        f'{i2}<position>\n'
        f'{i3}<separate val="false"/>\n'
        f'{i3}<x val="{offset_x}" defaultValue="0"/>\n'
        f'{i3}<y val="{offset_y}" defaultValue="0"/>\n'
        f'{i3}<z val="0" defaultValue="0"/>\n'
        f'{i2}</position>\n'
        f'{i2}<scale>\n'
        f'{i3}<separate val="true"/>\n'
        f'{i3}<inFields val="false"/>\n'
        f'{i3}<xy val="1" defaultValue="1"/>\n'
        f'{i3}<x val="1" defaultValue="1"/>\n'
        f'{i3}<y val="1" defaultValue="1"/>\n'
        f'{i3}<z val="1" defaultValue="1"/>\n'
        f'{i2}</scale>\n'
        f'{i2}<rotation>\n'
        f'{i3}<separate val="false"/>\n'
        f'{i3}<anglex val="0" defaultValue="0"/>\n'
        f'{i3}<angley val="0" defaultValue="0"/>\n'
        f'{i3}<anglez val="0" defaultValue="0"/>\n'
        f'{i2}</rotation>\n'
        f'{i2}<angle val="0" defaultValue="0"/>\n'
        f'{i2}<skew val="0" defaultValue="0"/>\n'
        f'{i2}<pivot>\n'
        f'{i3}<x val="0" defaultValue="0"/>\n'
        f'{i3}<y val="0" defaultValue="0"/>\n'
        f'{i3}<z val="0" defaultValue="0"/>\n'
        f'{i2}</pivot>\n'
        f'{i2}<splineOffset>\n'
        f'{i3}<x val="0" defaultValue="0"/>\n'
        f'{i3}<y val="0" defaultValue="0"/>\n'
        f'{i3}<z val="0" defaultValue="0"/>\n'
        f'{i2}</splineOffset>\n'
        f'{i2}<ignoreParentPegScaling val="false"/>\n'
        f'{i2}<disableFieldRendering val="false"/>\n'
        f'{i2}<depth val="0"/>\n'
        f'{i2}<groupAtNetworkBuilding val="false"/>\n'
        f'{i2}<addCompositeToGroup val="true"/>\n'
        f'{i1}</attrs>\n'
        f'{indent}</module>'
    )

    read_xml = (
        f'{indent}<module type="READ" name="{layer_name}" pos="0,0,0"'
        f' publishUnderTab="{layer_name}">\n'
        f'{i1}<options>\n'
        f'{i2}<collapsed val="false"/>\n'
        f'{i2}<version val="1"/>\n'
        f'{i1}</options>\n'
        f'{i1}<attrs>\n'
        f'{i2}<enable3d val="false"/>\n'
        f'{i2}<faceCamera val="false"/>\n'
        f'{i2}<cameraAlignment val="NO_CAMERA_ALIGNMENT"/>\n'
        f'{i2}<offset>\n'
        f'{i3}<separate val="false"/>\n'
        f'{i3}<x val="0" defaultValue="0"/>\n'
        f'{i3}<y val="0" defaultValue="0"/>\n'
        f'{i3}<z val="0" defaultValue="0"/>\n'
        f'{i2}</offset>\n'
        f'{i2}<scale>\n'
        f'{i3}<separate val="true"/>\n'
        f'{i3}<inFields val="false"/>\n'
        f'{i3}<xy val="{scale_x}" defaultValue="1"/>\n'
        f'{i3}<x val="{scale_x}" defaultValue="1"/>\n'
        f'{i3}<y val="{scale_y}" defaultValue="1"/>\n'
        f'{i3}<z val="1" defaultValue="1"/>\n'
        f'{i2}</scale>\n'
        f'{i2}<rotation>\n'
        f'{i3}<separate val="false"/>\n'
        f'{i3}<anglex val="0" defaultValue="0"/>\n'
        f'{i3}<angley val="0" defaultValue="0"/>\n'
        f'{i3}<anglez val="0" defaultValue="0"/>\n'
        f'{i2}</rotation>\n'
        f'{i2}<angle val="0" defaultValue="0"/>\n'
        f'{i2}<skew val="0" defaultValue="0"/>\n'
        f'{i2}<pivot>\n'
        f'{i3}<x val="0" defaultValue="0"/>\n'
        f'{i3}<y val="0" defaultValue="0"/>\n'
        f'{i3}<z val="0" defaultValue="0"/>\n'
        f'{i2}</pivot>\n'
        f'{i2}<drawing>\n'
        f'{i3}<elementMode val="true"/>\n'
        f'{i3}<element col="{layer_name}">\n'
        f'{i3} <layer/>\n'
        f'{i3}</element>\n'
        f'{i3}<customName>\n'
        f'{i3} <name/>\n'
        f'{i3} <extension val="jpg"/>\n'
        f'{i3} <fieldChart val="12" defaultValue="12"/>\n'
        f'{i3}</customName>\n'
        f'{i2}</drawing>\n'
        f'{i2}<readColor val="true"/>\n'
        f'{i2}<readTransparency val="true"/>\n'
        f'{i2}<colorTransformation val="Linear"/>\n'
        f'{i2}<colorSpace val="sRGB"/>\n'
        f'{i2}<applyMatteToColor val="N"/>\n'
        f'{i2}<antialiasingQuality val="HIGH"/>\n'
        f'{i2}<antialiasingExponent val="1" defaultValue="1"/>\n'
        f'{i2}<opacity val="100" defaultValue="100"/>\n'
        f'{i2}<alignmentRule val="CENTER_FIRST_PAGE"/>\n'
        f'{i2}<canAnimate val="true"/>\n'
        f'{i1}</attrs>\n'
        f'{indent}</module>'
    )

    content = content[:m.start()] + peg_xml + "\n" + read_xml + content[m.end():]

    # --- 3. Patch links: READ -> PEG, PEG -> Composite (same inport as placeholder) ---
    content = _re.sub(
        rf'<link out="{_re.escape(layer_name)}" in="Composite" inport="([^"]+)"/>',
        rf'<link out="{peg_name}" in="Composite" inport="\1"/>',
        content,
        count=1,
    )
    read_to_peg_link = f'<link out="{layer_name}" in="{peg_name}"/>'
    if read_to_peg_link not in content:
        content = _re.sub(
            r'(\s*</linkedlist>)',
            f'\n     {read_to_peg_link}\1',
            content,
            count=1,
        )

    xstage_path.write_text(content, encoding="utf-8")
