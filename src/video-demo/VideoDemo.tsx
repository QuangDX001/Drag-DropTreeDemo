import React, { useEffect, useMemo, useRef, useState } from "react";
import "../css/video.css";
import { playSafe, seekAsync, waitUntilTime } from "../helper/helper";

/**
 * Video Click-to-Cut Demo (no DB)
 * - Left: video player. Click once to start a segment; click again to end it.
 * - Right: live list of segments with name, start, end, duration.
 * - Play a segment, play all, rename, delete, export JSON.
 * - Works with any direct video URL (CORS must allow playback in the browser).
 *
 * Tips:
 *  - Keyboard: Space = play/pause, M = mark start/stop, Backspace = cancel ongoing mark, ArrowLeft/Right = -/+ 1s.
 *  - Speed: adjust playbackRate from the dropdown.
 */

const SAMPLE_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

// Types
interface Segment {
  id: string;
  name: string;
  start: number; // seconds
  end: number; // seconds
}

export default function VideoClickCutDemo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>(SAMPLE_URL);
  const [inputUrl, setInputUrl] = useState<string>(SAMPLE_URL);

  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  // marking state
  const [isMarking, setIsMarking] = useState(false);
  const [markStart, setMarkStart] = useState<number | null>(null);

  const [playbackRate, setPlaybackRate] = useState(1);

  // Sync playbackRate to player
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = playbackRate;
  }, [playbackRate]);

  // Stop playback when currentTime passes active segment end
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      if (!activeSegmentId) return;
      const seg = segments.find((s) => s.id === activeSegmentId);
      if (!seg) return;
      if (v.currentTime >= seg.end - 0.01) {
        v.pause();
        setActiveSegmentId(null);
      }
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [activeSegmentId, segments]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (v.paused) v.play();
        else v.pause();
      }
      if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleMark();
      }
      if (e.key === "Backspace") {
        if (isMarking) {
          e.preventDefault();
          cancelMark();
        }
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        v.currentTime = Math.max(0, v.currentTime - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 1);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMarking, markStart, videoUrl, segments, activeSegmentId]);

  const fmt = (t: number) => {
    if (!isFinite(t)) return "0:00.000";
    const mm = Math.floor(t / 60);
    const ss = (t % 60).toFixed(3).padStart(6, "0");
    return `${mm}:${ss}`;
  };

  const duration = (s: Segment) => Math.max(0, s.end - s.start);

  const startMark = () => {
    const v = videoRef.current;
    if (!v) return;
    setIsMarking(true);
    setMarkStart(v.currentTime);
    if (v.paused) v.play();
  };

  const endMark = () => {
    const v = videoRef.current;
    if (!v || markStart === null) return;
    const end = v.currentTime;
    const start = markStart;
    if (end <= start + 0.01) {
      console.warn("Segment too short. Seek or play forward before saving.");
      setIsMarking(false);
      setMarkStart(null);
      return;
    }
    const id = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const idx = segments.length + 1;
    const newSeg: Segment = { id, name: `Cut #${idx}`, start, end };
    setSegments((prev) => sortByTime([...prev, newSeg]));
    setIsMarking(false);
    setMarkStart(null);
  };

  const cancelMark = () => {
    setIsMarking(false);
    setMarkStart(null);
  };

  const toggleMark = () => {
    if (!isMarking) startMark();
    else endMark();
  };

  const sortByTime = (list: Segment[]) =>
    list.slice().sort((a, b) => a.start - b.start);

  const onVideoClick = () => {
    toggleMark();
  };

  const playSegment = (seg: Segment) => {
    const v = videoRef.current;
    if (!v) return;
    setActiveSegmentId(seg.id);
    v.currentTime = seg.start;
    v.play();
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, t), v.duration || Infinity);
  };

  const removeSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    if (activeSegmentId === id) setActiveSegmentId(null);
  };

  // const renameSegment = (id: string) => {
  //   const s = segments.find((x) => x.id === id);
  //   if (!s) return;
  //   const next = prompt("Rename segment", s.name);
  //   if (!next) return;
  //   setSegments((prev) =>
  //     prev.map((seg) => (seg.id === id ? { ...seg, name: next } : seg))
  //   );
  // };

  const exportJson = () => {
    const payload = segments.map((s) => ({
      id: s.id,
      name: s.name,
      start: Number(s.start.toFixed(3)),
      end: Number(s.end.toFixed(3)),
      duration: Number((s.end - s.start).toFixed(3)),
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "segments.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (confirm("Clear all segments?")) {
      setSegments([]);
      setActiveSegmentId(null);
    }
  };

  const onLoadVideo = () => {
    setVideoUrl(inputUrl.trim());
    setSegments([]);
    setActiveSegmentId(null);
    setIsMarking(false);
    setMarkStart(null);
  };

  const onLoadedMetadata = () => {
    // no-op, but could prefill a full-length segment if desired
  };

  const isValidUrl = useMemo(
    () => !!inputUrl && /^(https?:)?\/\//i.test(inputUrl),
    [inputUrl]
  );

  return (
    <div className="vxe-editor">
      {/* Top row */}
      <div className="vxe-row">
        <div className="vxe-col vxe-grow">
          <label className="vxe-label">Video URL</label>
          <input
            className="vxe-input"
            placeholder="Paste a direct .mp4/.webm URL"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
          />
        </div>

        <button
          onClick={onLoadVideo}
          disabled={!isValidUrl}
          className="vxe-btn primary"
          title={!isValidUrl ? "Enter a valid http(s) URL" : "Load video"}
        >
          Load
        </button>

        <div className="vxe-inline">
          <label className="vxe-label">Speed</label>
          <select
            className="vxe-input"
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
          >
            <option value={0.5}>0.5×</option>
            <option value={0.75}>0.75×</option>
            <option value={1}>1×</option>
            <option value={1.25}>1.25×</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
        </div>
      </div>

      <div className="vxe-grid">
        {/* Left: Player */}
        <div className="vxe-panel">
          {/* Video + tiny HUD stay inside the wrap */}
          <div className="vxe-videoWrap">
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  onClick={onVideoClick}
                  onLoadedMetadata={onLoadedMetadata}
                  className="vxe-video"
                />

                {/* HUD */}
                <div className="vxe-hud">
                  {isMarking && (
                    <span className="vxe-chip">
                      REC • start @ {fmt(markStart || 0)}
                    </span>
                  )}
                  {activeSegmentId && (
                    <span className="vxe-chip">Playing segment</span>
                  )}
                </div>
              </>
            ) : (
              <div className="vxe-empty">
                Paste a video URL above and click <b>Load</b>.
              </div>
            )}
          </div>

          {videoUrl && (
            <div className="vxe-pad">
              <div className="vxe-controlsBar">
                <button
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    if (v.paused) v.play();
                    else v.pause();
                  }}
                  className="vxe-btn"
                >
                  Play/Pause
                </button>

                <button
                  onClick={() =>
                    seekTo((videoRef.current?.currentTime || 0) - 1)
                  }
                  className="vxe-btn"
                >
                  -1s
                </button>

                <button
                  onClick={() =>
                    seekTo((videoRef.current?.currentTime || 0) + 1)
                  }
                  className="vxe-btn"
                >
                  +1s
                </button>

                {!isMarking ? (
                  <button onClick={startMark} className="vxe-btn danger">
                    Mark start (M)
                  </button>
                ) : (
                  <>
                    <button onClick={endMark} className="vxe-btn success">
                      End & save (M)
                    </button>
                    <button onClick={cancelMark} className="vxe-btn">
                      Cancel (⌫)
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Segments list */}
        <div className="vxe-panel">
          <div className="vxe-pad">
            <div className="vxe-row space">
              <h3 className="vxe-title">Segments</h3>
              <div className="vxe-inline">
                <button
                  onClick={exportJson}
                  disabled={segments.length === 0}
                  className="vxe-btn"
                >
                  Export JSON
                </button>
                <button
                  onClick={clearAll}
                  disabled={segments.length === 0}
                  className="vxe-btn"
                >
                  Clear
                </button>
              </div>
            </div>

            {segments.length === 0 ? (
              <p className="vxe-muted">
                Click the video to <b>mark start</b>, then click again to{" "}
                <b>end</b> and save a segment. Use <b>M</b> as shortcut.
              </p>
            ) : (
              <ul className="vxe-list">
                {segments.map((s, i) => (
                  <li key={s.id} className="vxe-segItem">
                    <div className="vxe-segHead">
                      <span className="vxe-idx">#{i + 1}</span>
                      <input
                        className="vxe-segName"
                        value={s.name}
                        onChange={(e) =>
                          setSegments((prev) =>
                            prev.map((x) =>
                              x.id === s.id ? { ...x, name: e.target.value } : x
                            )
                          )
                        }
                      />
                      <button
                        onClick={() => playSegment(s)}
                        className="vxe-btn success"
                      >
                        Play
                      </button>
                      <button
                        onClick={() => seekTo(s.start)}
                        className="vxe-btn"
                      >
                        Seek
                      </button>
                      <button
                        onClick={() => removeSegment(s.id)}
                        className="vxe-btn danger"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="vxe-segMeta">
                      <div>
                        <span className="vxe-muted">Start:</span> {fmt(s.start)}
                      </div>
                      <div>
                        <span className="vxe-muted">End:</span> {fmt(s.end)}
                      </div>
                      <div>
                        <span className="vxe-muted">Duration:</span>{" "}
                        {fmt(duration(s))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {segments.length > 0 && (
              <div className="vxe-row">
                <button
                  onClick={async () => {
                    const v = videoRef.current;
                    if (!v) return;

                    const ordered = segments
                      .slice()
                      .sort((a, b) => a.start - b.start);
                    const prevMuted = v.muted;

                    try {
                      for (const seg of ordered) {
                        setActiveSegmentId(seg.id);

                        // 1) Seek and wait
                        await seekAsync(v, seg.start);

                        // 2) Start playback (autoplay-safe)
                        await playSafe(v);

                        // 3) Wait until we hit seg.end, then pause
                        await waitUntilTime(v, seg.end);
                      }
                    } finally {
                      v.pause();
                      v.muted = prevMuted;
                      setActiveSegmentId(null);
                    }
                  }}
                  className="vxe-btn success"
                  style={{ marginTop: 5 }}
                >
                  Play all
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="vxe-footer">
        <p>
          <b>How to use:</b> Paste a direct video URL, click <i>Load</i>. Click
          the video to set a start point, click again to end and save the
          segment. Use the right-side actions to play, seek, rename, or delete.
        </p>
      </div>
    </div>
  );
}
