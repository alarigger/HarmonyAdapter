import re
import shutil
from pathlib import Path

from app.integrations.harmony.HarmonyConnector import HarmonyConnector


class HarmonyBGPreviewImporter:
    """Concrete implementation of the BGPreviewImporter protocol for Harmony.

    Satisfies the Protocol defined in
    ``miyu.claudy.scene_builder.bg_preview_import.BGPreviewImporter``.

    Delegates the actual import to the ``import_bg_preview`` JS script
    via :class:`HarmonyConnector`, which runs Harmony in batch mode.

    After Harmony exits, the saved xstage XML is patched directly to add the
    exposure entries: ``column.setEntry()`` crashes with ACCESS_VIOLATION in
    Harmony 25 batch mode, so exposures cannot be set from the JS script.
    """

    def import_jpg_as_bg(
        self,
        jpg_path: Path,
        scene_path: Path,
        layer_name: str = "BG_preview",
    ) -> None:
        """Import *jpg_path* as a raster BG layer in *scene_path*.

        Parameters
        ----------
        jpg_path:
            Absolute path to the source JPG (resolved by MiyuBGPreviewResolver).
        scene_path:
            Target ``.xstage`` file to import into.
        layer_name:
            Name of the READ node to create (or replace) in the scene.
            Defaults to ``"BG_preview"``.
        """
        harmony = HarmonyConnector()
        args = {
            "jpg_path": str(jpg_path),
            "layer_name": layer_name,
        }
        harmony.run_script(str(scene_path), "import_bg_preview", args)
        self._post_process_xstage(Path(scene_path), Path(jpg_path), layer_name)

    @staticmethod
    def _post_process_xstage(
        scene_path: Path, jpg_path: Path, layer_name: str
    ) -> None:
        """Copy the JPG, inject exposures, and fix the PLACEHOLDER → READ module.

        Three things cannot be done reliably from the JS script in Harmony 25 batch mode:

        1. **File copy** — ``element.physicalName(id)`` returns the *elementName*
           (e.g. ``"BG_preview"``) rather than the actual *elementFolder* on disk
           (e.g. ``"BG_preview.22"``).  We parse the xstage XML here to get the
           real folder and copy the JPG there.

        2. **Exposures** — ``column.setEntry()`` crashes with ACCESS_VIOLATION in
           Harmony 25 batch mode.  We inject ``<elementSeq>`` directly into the XML.

        3. **Module type** — ``node.add("Top", "READ", ...)`` in batch mode always
           creates a ``PLACEHOLDER`` module instead of a proper ``READ`` module.
           A PLACEHOLDER has no drawing capabilities, so the image is invisible.
           We replace it with a complete READ module that references our drawing column.
        """
        content = scene_path.read_text(encoding="utf-8")

        # --- Find the element id from the column, then the real elementFolder ---
        m_col = re.search(
            rf'<column\b(?=[^>]*\bname="{re.escape(layer_name)}")[^>]*\bid="(\d+)"',
            content,
        )
        if m_col:
            elem_id_str = m_col.group(1)
            m_elem_tag = re.search(
                rf'<element\b(?=[^>]*\bid="{elem_id_str}")[^>]*/?>',
                content,
            )
            if m_elem_tag:
                tag = m_elem_tag.group(0)
                m_name = re.search(r'\belementName="([^"]+)"', tag)
                m_folder = re.search(r'\belementFolder="([^"]+)"', tag)
                if m_name and m_folder:
                    elem_name = m_name.group(1)
                    elem_folder = m_folder.group(1)
                    # Drawing.filename() convention:
                    # elements/{elementFolder}/{elementName}-{drawingName}.{ext}
                    dest = scene_path.parent / "elements" / elem_folder / f"{elem_name}-1.jpg"
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(str(jpg_path), str(dest))

        # --- Read scene stop frame ---
        m_stop = re.search(r'<scene\b[^>]*\bstopFrame="(\d+)"', content)
        stop_frame = m_stop.group(1) if m_stop else "1"

        # --- Inject exposures (replace column with <elementSeq> children) ---
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
            return (
                f"{opening_tag}>\n"
                f'     <elementSeq exposures="1-{stop_frame}" val="1" id="{eid}"/>\n'
                f"    </column>"
            )

        content = re.sub(col_pattern, _replace_col, content, flags=re.DOTALL)

        # --- Fix PLACEHOLDER → proper READ module ---
        # In Harmony 25 batch mode, node.add("Top", "READ", ...) always creates a
        # PLACEHOLDER module (no drawing attrs) instead of a proper READ module.
        # We replace it with a full READ module that references our drawing column.
        placeholder_pat = (
            rf'<module\s+type="PLACEHOLDER"\s+name="{re.escape(layer_name)}"\s+'
            r'pos="([^"]*)"\s+publishUnderTab="READ"\s*/>'
        )
        m_ph = re.search(placeholder_pat, content)
        if m_ph:
            pos = m_ph.group(1)
            read_module = _build_read_module_xml(layer_name, pos)
            content = content[:m_ph.start()] + read_module + content[m_ph.end():]

        scene_path.write_text(content, encoding="utf-8")


def _build_read_module_xml(name: str, pos: str) -> str:
    """Return the full XML for a static (no animation) READ module.

    The module draws from the named drawing column *name* and uses JPEG files
    (``extension="jpg"``).  All transforms are at their default values — no
    animation columns are referenced, which is fine for a static BG preview.

    The structure matches what Harmony 25 writes for a normal READ node, with
    ``col=`` references stripped from every transform attribute.
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
        f'        <x val="0" defaultValue="0"/>\n'
        f'        <y val="0" defaultValue="0"/>\n'
        f'        <z val="0" defaultValue="0"/>\n'
        f'       </offset>\n'
        f'       <scale>\n'
        f'        <separate val="true"/>\n'
        f'        <inFields val="false"/>\n'
        f'        <xy val="1" defaultValue="1"/>\n'
        f'        <x val="1" defaultValue="1"/>\n'
        f'        <y val="1" defaultValue="1"/>\n'
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
        f'         <extension val="jpg"/>\n'
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
