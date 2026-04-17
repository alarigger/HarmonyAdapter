from enum import Enum, auto

class Software(Enum):
    HARMONY = auto()
    BLENDER = auto()
    PHOTOSHOP = auto()
    AFTEREFFECT = auto()
    MOHO = auto()
    TVPAINT = auto()
    UNKNOWN = auto()

    @classmethod
    def from_file(cls, file_path: str):
        ext = file_path.lower().split('.')[-1]
        if ext in ("blend",):
            return cls.BLENDER
        elif ext in ("xstage", "tpl", "tbscene"):
            return cls.HARMONY        
        elif ext in ("tvp", "tpl"):
            return cls.TVPAINT
        else:
            raise cls.UNKNOWN