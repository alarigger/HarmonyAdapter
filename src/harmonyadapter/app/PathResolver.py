import os


class PathResolver:

    @staticmethod
    def resolve(path: str) -> str:
        if not path:
            return path

        library_root = os.getenv("HARMONY_LIBRARY_PATH")

        if "__LIBRARY__" in path:
            if not library_root:
                raise RuntimeError("HARMONY_LIBRARY_PATH is not set")

            path = path.replace("__LIBRARY__", library_root)

        return os.path.normpath(path)