from dataclasses import dataclass
from typing import Optional
from .Camera import Camera
from .Episode import Episode
import re
from typing import Callable
from pathlib import Path
from typing import Optional

@dataclass
class Shot:
    name:str = None
    episode:Optional[Episode] = None
    path: Optional[str] = None
    camera: Optional[Camera] = None

    def set_camera(self, camera: Camera) -> None:
        self.camera = camera

    def __str__(self) -> str:
        return (
            f"Shot\n"
            f"  Path   : {self.path or 'No Path'}\n"
            f"  Camera : {self.camera or 'No Camera'}"
        )
        



class ShotNameParser:
    """
    Extract shot names from file paths or filenames.

    Supported examples:

        /show/seq010/SH019/layout/file.psd
        -> SH019

        P:/prod/pl016/bg/color/image.png
        -> PL016

        seq020_sh045_anim_v003.mb
        -> SH045

        019_comp_v001.nk
        -> 019
    """

    # Ordered from most explicit -> most generic
    _PATTERNS = [

        # SH019 / sh019
        re.compile(r"\b(SH\d{2,5})\b", re.IGNORECASE),

        # PL016 / pl016
        re.compile(r"\b(PL\d{2,5})\b", re.IGNORECASE),

        # SQ010_SH020
        re.compile(r"\b(SQ\d+[_\-]SH\d+)\b", re.IGNORECASE),

        # Generic pure number shot
        # avoids years like 2024 by limiting size
        re.compile(r"\b(\d{2,4})\b"),
    ]

    # -------------------------------------------------------------------------
    # PUBLIC API
    # -------------------------------------------------------------------------

    @classmethod
    def parse(cls, path: str) -> Optional[str]:
        """
        Extract shot name from a path or filename.

        Returns:
            str | None
        """

        if not path:
            return None

        # Normalize separators
        normalized = str(Path(path)).replace("\\", "/")

        # Search full path first
        result = cls._search(normalized)

        if result:
            return result

        # Fallback to filename only
        filename = Path(normalized).stem

        return cls._search(filename)

    # -------------------------------------------------------------------------
    # INTERNALS
    # -------------------------------------------------------------------------

    @classmethod
    def _search(cls, text: str) -> Optional[str]:

        for pattern in cls._PATTERNS:

            match = pattern.search(text)

            if match:
                return match.group(1).upper()

        return None
        
class ShotNormalizer:
    """
    Normalize shot names depending on studio rules.

    Example:
        "019"  -> "SH019"
        "pl016" -> "PL016"
    """

    # Shared registry for all normalizing methods
    _strategy_table: dict[str, Callable[[str], str]] = {}
    _strategy:str= "_us_standard"

    # -------------------------------------------------------------------------
    # DECORATOR
    # -------------------------------------------------------------------------

    @classmethod
    def register_strategy(cls, name: str):
        """
        Decorator used to register a normalization method.
        """

        def decorator(func: Callable[[str], str]):
            cls._strategy_table[name] = func
            return func

        return decorator

    # -------------------------------------------------------------------------
    # INIT
    # -------------------------------------------------------------------------

    def __init__(self, strategy: str = "us_standard"):
        self._strategy = strategy

    # -------------------------------------------------------------------------
    # PUBLIC API
    # -------------------------------------------------------------------------

    def normalize(self, shot_name: str, strategy_name:str="us_standard") -> str:
        """
        Normalize a shot name using current method.
        """

        strategy = self._strategy_table.get(strategy_name) or self._strategy
        if not strategy:
            return shot_name

        return strategy(self, shot_name)




# =============================================================================
# REGISTERED METHODS
# =============================================================================


@ShotNormalizer.register_strategy("us_standard")
def _us_standard(self, shot_name: str) -> str:
    """
    Examples:
        019     -> SH019
        sh020   -> SH020
    """

    shot_name = shot_name.strip().upper()

    digits = re.findall(r"\d+", shot_name)

    if not digits:
        return shot_name

    return f"SH{digits[0].zfill(3)}"


@ShotNormalizer.register_strategy("fr_standard")
def _fr_standard(self, shot_name: str) -> str:
    """
    Examples:
        016     -> PL016
        pl12    -> PL012
    """

    shot_name = shot_name.strip().upper()

    digits = re.findall(r"\d+", shot_name)

    if not digits:
        return shot_name

    return f"PL{digits[0].zfill(3)}"