import os
import tempfile
from psd_tools import PSDImage
import uuid

class ProxyGenerator:
    
    _prefix:str="_proxy"

    @staticmethod
    def from_psd(
        psd_path: str,
        image_format: str = "png",
        output_dir: str | None = None,
    ) -> str:
        """
        Generate a flattened proxy image from a PSD.

        Args:
            psd_path: input PSD file
            image_format: png/jpg/webp
            output_dir:
                - None → system temp folder
                - "next_to_source" → same folder as PSD
                - custom path → user-defined folder
        """

        psd = PSDImage.open(psd_path)
        image = psd.composite()

        if image is None:
            raise ValueError(f"Could not composite PSD: {psd_path}")

        image_format = ProxyGenerator._normalize_format(image_format)

        # -------------------------
        # build output path
        # -------------------------
        
        out_path = ProxyGenerator._generate_path(
            psd_path=psd_path,
            image_format=image_format.lower(),
            output_dir=output_dir,
        )

        # -------------------------
        # save
        # -------------------------
        

        image.save(out_path, format=image_format.upper())

        return out_path
    
    def _normalize_format(image_format: str) -> str:
        fmt = image_format.lower()

        if fmt in ("jpg", "jpeg"):
            return "JPEG"
        if fmt == "png":
            return "PNG"
        if fmt == "webp":
            return "WEBP"

        raise ValueError(f"Unsupported image format: {image_format}")
    
    @staticmethod
    def _generate_path(
        psd_path: str,
        image_format: str,
        output_dir: str | None = None,
    ) -> str:

        # -------------------------
        # resolve output directory
        # -------------------------

        if output_dir is None:
            out_dir = tempfile.gettempdir()

        elif output_dir == "_next_to_source_":
            out_dir = os.path.dirname(psd_path)

        else:
            out_dir = output_dir

        os.makedirs(out_dir, exist_ok=True)

        # -------------------------
        # build output filename
        # -------------------------

        base_name = os.path.splitext(
            os.path.basename(psd_path)
        )[0]

        filename = f"{base_name}_proxy.{image_format}"

        # Harmony-safe filename limit
        if len(filename) > 40:
            short_id = uuid.uuid4().hex[:8]
            filename = f"{short_id}_proxy.{image_format}"

        return os.path.join(out_dir, filename)