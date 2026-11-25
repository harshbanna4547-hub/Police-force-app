import { useEffect, useMemo, useRef, useState } from "react";

/**
 * [APP] MediaPlayerApp — Plays uploaded .mp4, .webm, .mp3 training media with speed & volume controls
 */
export default function MediaPlayerApp({ item, mediaList = [], language = "hi" }) {
  const english = language === "en";
  const playlist = useMemo(
    () => (mediaList.length ? mediaList : item ? [item] : []),
    [mediaList, item]
  );
  const [selectedId, setSelectedId] = useState(() => item?.id || playlist[0]?.id || "");
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const mediaRef = useRef(null);

  const currentMedia = playlist.find((m) => m.id === selectedId) || playlist[0] || item;
  const isAudio = currentMedia && /\.(mp3|wav|ogg|m4a)$/i.test(String(currentMedia.name || ""));

  const mediaUrl = useMemo(() => {
    if (!currentMedia?.data) return "";
    return URL.createObjectURL(new Blob([currentMedia.data], { type: currentMedia.mime || (isAudio ? "audio/mpeg" : "video/mp4") }));
  }, [currentMedia, isAudio]);

  useEffect(() => () => {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
  }, [mediaUrl]);

  const applySpeed = (nextSpeed) => {
    setSpeed(nextSpeed);
    if (mediaRef.current) mediaRef.current.playbackRate = nextSpeed;
  };

  const applyVolume = (nextVol) => {
    setVolume(nextVol);
    if (mediaRef.current) mediaRef.current.volume = nextVol;
  };

  return (
    <>
      <div className="wapp-ribbon">
        <span>🎬 {currentMedia?.name || (english ? "No media file selected" : "कोई मीडिया फ़ाइल नहीं")}</span>

        {playlist.length > 1 && (
          <select
            aria-label="Playlist"
            value={currentMedia?.id || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="wapp-select"
          >
            {playlist.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}

        {[1, 1.5, 2].map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={() => applySpeed(rate)}
            className={`wapp-btn${speed === rate ? " is-active" : ""}`}
          >
            {rate}x
          </button>
        ))}

        <label className="wapp-btn">
          🔊 {Math.round(volume * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => applyVolume(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="wapp-media-stage">
        {mediaUrl ? (
          isAudio ? (
            <audio
              ref={mediaRef}
              controls
              src={mediaUrl}
              onLoadedMetadata={() => {
                if (mediaRef.current) {
                  mediaRef.current.playbackRate = speed;
                  mediaRef.current.volume = volume;
                }
              }}
              className="wapp-audio-el"
            />
          ) : (
            <video
              ref={mediaRef}
              controls
              src={mediaUrl}
              onLoadedMetadata={() => {
                if (mediaRef.current) {
                  mediaRef.current.playbackRate = speed;
                  mediaRef.current.volume = volume;
                }
              }}
              className="wapp-video-el"
            />
          )
        ) : (
          <p>{english ? "Upload or open a .mp4, .webm, or .mp3 file from Storage Vault." : "Storage Vault से कोई .mp4, .webm या .mp3 फ़ाइल खोलें।"}</p>
        )}
      </div>
    </>
  );
}
