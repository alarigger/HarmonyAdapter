import os
import tempfile
from psd_tools import PSDImage


class ProxyGenerator:

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

        base_name = os.path.splitext(os.path.basename(psd_path))[0]
        out_path = os.path.join(
            out_dir,
            f"{base_name}_proxy.{image_format}"
        )

        # -------------------------
        # save
        # -------------------------
        
        image_format = ProxyGenerator._normalize_format(image_format)

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