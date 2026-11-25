import { useLayoutEffect, useRef, useState } from "react";
import "./apps.css";

/**
 * [COMPONENT] DesktopWindowFrame — Movable Windows 11 App Window Shell
 * Uses DOM ref positioning (Zero JSX Inline Styles) with Minimize / Maximize / Close controls.
 */
export default function DesktopWindowFrame({
  title,
  icon = "🪟",
  minimized = false,
  onMinimize,
  onClose,
  onFocus,
  initialWidth = "wide",
  children
}) {
  const [maximized, setMaximized] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const frameRef = useRef(null);
  const dragStateRef = useRef(null);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el || maximized) {
      if (el) el.style.transform = "";
      return;
    }
    el.style.transform = offset.x || offset.y ? `translate3d(${offset.x}px, ${offset.y}px, 0)` : "";
  }, [offset, maximized]);

  if (minimized) return null;

  const handleTitlePointerDown = (e) => {
    if (maximized || e.target.closest("button")) return;
    onFocus?.();
    const startX = e.clientX;
    const startY = e.clientY;
    const base = { ...offset };
    dragStateRef.current = { startX, startY, base };

    const onMove = (ev) => {
      if (!dragStateRef.current || !frameRef.current) return;
      const dx = ev.clientX - dragStateRef.current.startX;
      const dy = ev.clientY - dragStateRef.current.startY;
      frameRef.current.style.transform = `translate3d(${dragStateRef.current.base.x + dx}px, ${dragStateRef.current.base.y + dy}px, 0)`;
    };

    const onUp = (ev) => {
      if (dragStateRef.current) {
        const dx = ev.clientX - dragStateRef.current.startX;
        const dy = ev.clientY - dragStateRef.current.startY;
        setOffset({ x: dragStateRef.current.base.x + dx, y: dragStateRef.current.base.y + dy });
      }
      dragStateRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={frameRef}
      role="dialog"
      aria-label={title}
      onMouseDown={() => onFocus?.()}
      className={`win11-app-window is-${initialWidth}${maximized ? " is-maximized" : ""}`}
    >
      <header
        className="win11-app-titlebar"
        onPointerDown={handleTitlePointerDown}
        onDoubleClick={() => setMaximized((prev) => !prev)}
      >
        <div className="win11-app-title-left">
          <span aria-hidden="true">{icon}</span>
          <h3 className="win11-app-title-text">{title}</h3>
        </div>
        <div className="win11-window-controls">
          <button
            type="button"
            aria-label="Minimize window"
            onClick={onMinimize}
            className="win11-win-ctrl-btn"
          >
            —
          </button>
          <button
            type="button"
            aria-label="Maximize or Restore window"
            onClick={() => setMaximized((prev) => !prev)}
            className="win11-win-ctrl-btn"
          >
            {maximized ? "❐" : "□"}
          </button>
          <button
            type="button"
            aria-label="Close window"
            onClick={onClose}
            className="win11-win-ctrl-btn is-close"
          >
            ✕
          </button>
        </div>
      </header>
      <div className="win11-app-body">{children}</div>
    </div>
  );
}
