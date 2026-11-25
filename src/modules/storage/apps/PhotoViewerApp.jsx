import { useEffect, useMemo, useState } from "react";

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200];

/**
 * [APP] PhotoViewerApp — Windows Photo Viewer for .jpg, .png, .webp inside Storage Vault
 */
export default function PhotoViewerApp({ item, galleryItems = [], language = "hi" }) {
  const english = language === "en";
  const photos = useMemo(
    () => (galleryItems.length ? galleryItems : item ? [item] : []),
    [galleryItems, item]
  );
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, photos.findIndex((p) => p.id === item?.id))
  );
  const [zoomIdx, setZoomIdx] = useState(2); // 100%
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270

  const currentPhoto = photos[activeIndex] || item;
  const zoom = ZOOM_STEPS[zoomIdx] || 100;

  const objectUrl = useMemo(() => {
    if (!currentPhoto?.data) return "";
    return URL.createObjectURL(new Blob([currentPhoto.data], { type: currentPhoto.mime || "image/png" }));
  }, [currentPhoto]);

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  if (!currentPhoto) {
    return (
      <div className="wapp-photo-stage">
        <span className="win11-tile-label">No image loaded.</span>
      </div>
    );
  }

  return (
    <>
      <div className="wapp-ribbon">
        <button
          type="button"
          disabled={photos.length <= 1}
          onClick={() => setActiveIndex((i) => (i - 1 + photos.length) % photos.length)}
          className="wapp-btn"
        >
          ⬅️ {english ? "Prev" : "पिछला"}
        </button>
        <button
          type="button"
          disabled={photos.length <= 1}
          onClick={() => setActiveIndex((i) => (i + 1) % photos.length)}
          className="wapp-btn"
        >
          {english ? "Next" : "अगला"} ➡️
        </button>
        <button
          type="button"
          disabled={zoomIdx <= 0}
          onClick={() => setZoomIdx((z) => Math.max(0, z - 1))}
          className="wapp-btn"
        >
          ➖ Zoom Out
        </button>
        <span className="wapp-cell-ref-pill">{zoom}%</span>
        <button
          type="button"
          disabled={zoomIdx >= ZOOM_STEPS.length - 1}
          onClick={() => setZoomIdx((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))}
          className="wapp-btn"
        >
          ➕ Zoom In
        </button>
        <button
          type="button"
          onClick={() => setRotation((r) => (r + 270) % 360)}
          className="wapp-btn"
        >
          ↺ Rotate Left
        </button>
        <button
          type="button"
          onClick={() => setRotation((r) => (r + 90) % 360)}
          className="wapp-btn"
        >
          ↻ Rotate Right
        </button>
        <span className="wapp-status">
          {currentPhoto.name} ({activeIndex + 1}/{photos.length})
        </span>
      </div>

      <div className="wapp-photo-stage">
        {objectUrl && (
          <img
            src={objectUrl}
            alt={currentPhoto.name}
            className={`wapp-photo-img photo-zoom-${zoom} photo-rot-${rotation}`}
          />
        )}
      </div>
    </>
  );
}
