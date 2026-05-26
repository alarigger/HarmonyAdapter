import cv2
import numpy as np
from typing import Tuple, Optional
from ..model.Cadre import Rect


class ComputerVision:

    def detect_rectangle(
        self,
        image: np.ndarray,
        color: Tuple[int, int, int]
    ) -> Optional[Rect]:

        mask = self._create_color_mask(image, color)

        return self._rotated_rectangle_from_mask(mask)
    
    def _create_color_mask(self, image: np.ndarray, color: Tuple[int, int, int]) -> np.ndarray:

        lower = np.array([c - 10 for c in color], dtype=np.uint8)
        upper = np.array([c + 10 for c in color], dtype=np.uint8)

        mask = cv2.inRange(image[:, :, :3], lower, upper)

        return mask
    
    def _rotated_rectangle_from_mask(self, mask: np.ndarray) -> Optional[Rect]:

        contours, _ = cv2.findContours(
            mask,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )

        if not contours:
            return None

        largest = max(contours, key=cv2.contourArea)

        rect = cv2.minAreaRect(largest)

        return self._convert_min_area_rect(rect)
    
    def _convert_min_area_rect(self, rect) -> Rect:

        (cx, cy), (w, h), angle = rect

        # Normalize orientation:
        # OpenCV angle is tricky:
        # if width < height, swap and adjust angle

        if w < h:
            w, h = h, w
            angle += 90

        return Rect(
            x=cx,
            y=cy,
            width=w,
            height=h,
            angle=angle
        )