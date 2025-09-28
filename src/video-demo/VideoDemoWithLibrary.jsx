import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./css/video.css";
import ReactPlayer from "react-player";
import { playSafe, seekAsync, waitUntilTime } from "../helper/helper";

const sortByTime = (list) => list.slice().sort((a, b) => a.start - b.start);

export default function VideoEditorReactPlayer() {
  const playerRef = useRef(null);

  const [inputUrl, setInputUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const speeds = [8, 4, 2, 1.5, 1.25, 1, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2];

  const [segments, setSegments] = useState([]);
  const [activeSegmentId, setActiveSegmentId] = useState(null);

  // playback
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playing, setPlaying] = useState(false);

  // time/duration (for UI)
  const [now, setNow] = useState(0);
  const [dur, setDur] = useState(NaN);
  const [ready, setReady] = useState(false);

  // segment marking
  const [isMarking, setIsMarking] = useState(false);
  const [markStart, setMarkStart] = useState(null);

  // promise resolver used by "Play cut" / "Play all"
  const segDoneResolver = useRef(null);

  const isValidUrl = useMemo(
    () => /^https?:\/\//i.test(inputUrl || ""),
    [inputUrl]
  );

  const onLoadVideo = () => {
    setVideoUrl((inputUrl || "").trim());
    setSegments([]);
    setActiveSegmentId(null);
    setIsMarking(false);
    setMarkStart(null);
    setPlaying(false);
    setNow(0);
  };

  // --- helpers ---
  const fmt = (t) => {
    if (!isFinite(t)) return "0:00.000";
    const mm = Math.floor(t / 60);
    const ss = (t % 60).toFixed(3).padStart(6, "0");
    return `${mm}:${ss}`;
  };
  const sortByTime = (list) => list.slice().sort((a, b) => a.start - b.start);

  const getCT = useCallback(() => {
    const p = playerRef.current;
    if (p && typeof p.getCurrentTime === "function") {
      return p.getCurrentTime() ?? now;
    }
    return now;
  }, [now]);

  const getDur = useCallback(() => {
    const p = playerRef.current;
    const d = p && typeof p.getDuration === "function" ? p.getDuration() : dur;
    return Number.isFinite(d) ? d : dur;
  }, [dur]);

  const clamp = useCallback(
    (t) => {
      const d = getDur();
      if (!Number.isFinite(d)) return Math.max(0, t);
      return Math.min(Math.max(0, t), d - 0.001);
    },
    [getDur]
  );

  const safeSeekTo = useCallback(
    (absSec) => {
      const next = clamp(absSec);
      const p = playerRef.current;
      if (!p) return;

      // Prefer ReactPlayer API:
      if (typeof p.seekTo === "function") {
        p.seekTo(next, "seconds");
        setNow(next);
        return;
      }

      // Fallback to internal HTML5 <video> (for file playback)
      const internal =
        typeof p.getInternalPlayer === "function"
          ? p.getInternalPlayer()
          : null;
      if (internal && typeof internal.currentTime === "number") {
        internal.currentTime = next;
        setNow(next);
      }
    },
    [clamp]
  );

  const seekDelta = (delta) => safeSeekTo(getCT() + delta);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/i.test(t.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
      if (e.key && e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleMark();
      }
      if (e.key === "Backspace" && isMarking) {
        e.preventDefault();
        cancelMark();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekDelta(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        seekDelta(1);
      }
      if (e.key === ",") {
        e.preventDefault();
        seekDelta(-0.1);
      }
      if (e.key === ".") {
        e.preventDefault();
        seekDelta(0.1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMarking, markStart, videoUrl, segments, activeSegmentId]);

  // ----- marking -----
  const startMark = () => {
    const t = getCT();
    setIsMarking(true);
    setMarkStart(t);
    setPlaying(true);
  };

  const endMark = () => {
    if (markStart == null) return;
    const end = getCT();
    const start = markStart;
    if (end <= start + 0.01) {
      console.warn("Segment too short. Seek or play forward before saving.");
      setIsMarking(false);
      setMarkStart(null);
      return;
    }
    const id =
      globalThis.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    const idx = segments.length + 1;
    const newSeg = { id, name: `Cut #${idx}`, start, end };
    setSegments((prev) => sortByTime([...prev, newSeg]));
    setIsMarking(false);
    setMarkStart(null);
  };

  const cancelMark = () => {
    setIsMarking(false);
    setMarkStart(null);
  };
  const toggleMark = () => (!isMarking ? startMark() : endMark());

  // ----- segment ops -----
  const removeSegment = (id) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    if (activeSegmentId === id) setActiveSegmentId(null);
  };

  const updateSegment = (id, patch) => {
    setSegments((prev) => {
      const list = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
      return normalizeSegments(list);
    });
  };

  const playSegment = (seg) =>
    new Promise((resolve) => {
      setActiveSegmentId(seg.id);
      seekAbs(seg.start);
      setPlaying(true);
      segDoneResolver.current = () => resolve();
    });

  const clearAll = () => {
    if (confirm("Clear all segments?")) {
      setSegments([]);
      setActiveSegmentId(null);
    }
  };

  // Play all segments sequentially from the currently selected (or first)
  const playAll = async () => {
    if (!segments.length) return;
    const ordered = sortByTime(segments);
    for (const seg of ordered) {
      // wait each one to finish
      // eslint-disable-next-line no-await-in-loop
      await playSegment(seg);
    }
  };

  // ----- player events -----
  const onReady = () => setReady(true);
  const onDuration = (d) => setDur(d);

  const onProgress = ({ playedSeconds }) => {
    setNow(playedSeconds);

    // stop at segment end
    if (!activeSegmentId) return;
    const seg = segments.find((s) => s.id === activeSegmentId);
    if (!seg) return;
    if (playedSeconds >= seg.end - 0.01) {
      setPlaying(false);
      setActiveSegmentId(null);
      if (segDoneResolver.current) segDoneResolver.current();
      segDoneResolver.current = null;
    }
  };

  // ----- import / export -----
  const exportJson = () => {
    const payload = segments.map((s) => ({
      id: s.id,
      name: s.name,
      start: +s.start.toFixed(3),
      end: +s.end.toFixed(3),
      duration: +(s.end - s.start).toFixed(3),
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

  const importJson = async (file) => {
    const text = await file.text();
    try {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error("Invalid JSON");
      const mapped = arr
        .map((x, i) => ({
          id: x.id || Math.random().toString(36).slice(2),
          name: x.name || `Cut #${i + 1}`,
          start: clampNumber(+x.start, 0, getDur()),
          end: clampNumber(+x.end, 0, getDur()),
        }))
        .filter(
          (x) =>
            Number.isFinite(x.start) &&
            Number.isFinite(x.end) &&
            x.end > x.start + 0.01
        );
      setSegments(normalizeSegments(mapped));
    } catch (e) {
      alert("Failed to import JSON: " + e.message);
    }
  };

  return (
    <div className="vxe-editor">
      {/* top row */}
      <div className="vxe-row">
        <div className="vxe-col vxe-grow">
          <label className="vxe-label">Video URL</label>
          <input
            className="vxe-input"
            placeholder="Paste a video URL (YouTube, MP4, etc.)"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
          />
        </div>
        <button
          onClick={onLoadVideo}
          disabled={!isValidUrl}
          className="vxe-btn primary"
          title={isValidUrl ? "Load video" : "Enter a valid http(s) URL"}
        >
          Load
        </button>
      </div>

      <div className="vxe-grid vxe-grid--outer">
        <div className="vxe-leftGrid">
          {/* left: player */}
          <div className="vxe-grid vxe-grid--inner">
            <div className="vxe-panel vxe-playerPanel">
              <div className="vxe-videoWrap-library" onClick={toggleMark}>
                {videoUrl ? (
                  <ReactPlayer
                    ref={playerRef}
                    src={videoUrl}
                    playing={playing}
                    playbackRate={playbackRate}
                    controls
                    width="100%"
                    height="100%"
                    onReady={onReady}
                    onProgress={onProgress}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                    config={{
                      file: { attributes: { crossOrigin: "anonymous" } },
                    }}
                  />
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
                      className="vxe-btn"
                      onClick={() => setPlaying((p) => !p)}
                    >
                      {playing ? "Pause" : "Play"}
                    </button>

                    {/* <button className="vxe-btn" onClick={() => seekDelta(-1)}>
                  -1s
                </button>
                <button className="vxe-btn" onClick={() => seekDelta(1)}>
                  +1s
                </button> */}

                    {/* {!isMarking ? (
                  <button onClick={startMark} className="vxe-btn danger">
                    Mark start (M)
                  </button>
                ) : (
                  <>
                    <button onClick={endMark} className="vxe-btn success">
                      End &amp; save (M)
                    </button>
                    <button onClick={cancelMark} className="vxe-btn">
                      Cancel (⌫)
                    </button>
                  </>
                )} */}
                  </div>
                </div>
              )}
            </div>
            <div className="vxe-panel vxe-speedPanel">
              <div className="vxe-pad">
                <div className="vxe-speedTitle">Speed</div>
                <div className="vxe-speedList">
                  {speeds.map((s) => (
                    <button
                      key={s}
                      className={`vxe-speedBtn ${
                        playbackRate === s ? "active" : ""
                      }`}
                      onClick={() => setPlaybackRate(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* right: segments */}
        <div className="vxe-panel">
          <div className="vxe-pad">
            <div className="vxe-row space">
              <h3 className="vxe-title">Segments</h3>
              <div className="vxe-inline">
                <button
                  onClick={exportJson}
                  disabled={!segments.length}
                  className="vxe-btn"
                >
                  Export JSON
                </button>
                <button
                  onClick={clearAll}
                  disabled={!segments.length}
                  className="vxe-btn"
                >
                  Clear
                </button>
              </div>
            </div>

            {!segments.length ? (
              <p className="vxe-muted">
                Click <b>Mark start</b>, then <b>End &amp; save</b>. Use this
                list to play/seek/delete.
              </p>
            ) : (
              <ul className="vxe-list">
                {segments.map((s, i) => {
                  const active = s.id === activeSegmentId;
                  return (
                    <li
                      key={s.id}
                      className="vxe-segItem"
                      style={
                        active
                          ? { outline: "2px solid rgba(59,130,246,.6)" }
                          : undefined
                      }
                    >
                      <div className="vxe-segHead">
                        <span className="vxe-idx">#{i + 1}</span>
                        <input
                          className="vxe-segName"
                          value={s.name}
                          onChange={(e) =>
                            setSegments((prev) =>
                              prev.map((x) =>
                                x.id === s.id
                                  ? { ...x, name: e.target.value }
                                  : x
                              )
                            )
                          }
                        />
                        <button
                          className="vxe-btn success"
                          onClick={() => playSegment(s)}
                        >
                          Play
                        </button>
                        <button
                          className="vxe-btn"
                          onClick={() => seekAbs(s.start)}
                        >
                          Seek
                        </button>
                        <button
                          className="vxe-btn danger"
                          onClick={() => removeSegment(s.id)}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="vxe-segMeta">
                        <div>
                          <span className="vxe-muted">Start:</span>{" "}
                          {fmt(s.start)}
                        </div>
                        <div>
                          <span className="vxe-muted">End:</span> {fmt(s.end)}
                        </div>
                        <div>
                          <span className="vxe-muted">Duration:</span>{" "}
                          {fmt(Math.max(0, s.end - s.start))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {segments.length > 0 && (
              <div className="vxe-row">
                <button
                  className="vxe-btn success"
                  style={{ marginTop: 5 }}
                  onClick={playAll}
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
          <b>How to use:</b> Paste a video URL, click <i>Load</i>. Mark start,
          then end &amp; save.
        </p>
      </div>
    </div>
  );
}
