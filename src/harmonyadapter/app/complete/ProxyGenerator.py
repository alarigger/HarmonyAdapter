import os
import tempfile
from psd_tools import PSDImage


class ProxyGenerator:

    @staticmethod
    def from_psd(psd_path: str, image_format: str = "png") -> str:
        """
        Generate a flattened proxy image from a PSD and return temp file path.
        """

        psd = PSDImage.open(psd_path)

        # composite full PSD
        image = psd.composite()

        if image is None:
            raise ValueError(f"Could not composite PSD: {psd_path}")

        # temp output file
        tmp_dir = tempfile.gettempdir()
        file_name = os.path.splitext(os.path.basename(psd_path))[0]
        out_path = os.path.join(tmp_dir, f"{file_name}_proxy.{image_format}")

        # save image
        image.save(out_path, format=image_format.upper())

        # return out_path