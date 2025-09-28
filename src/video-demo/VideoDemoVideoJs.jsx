import React, { useEffect, useMemo, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

const SPEEDS = [4, 2, 1.5, 1.25, 1, 0.8, 0.6, 0.5, 0.4, 0.3];

const SRC =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const POSTER =
  "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?q=80&w=1200&auto=format&fit=crop";

function fmt(sec) {
  if (!isFinite(sec)) return "0:00";
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  const m = String(Math.floor((sec / 60) % 60));
  const h = Math.floor(sec / 3600);
  return h > 0 ? `${h}:${m.padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export default function CustomVideoDemo() {
  const containerRef = useRef(null); // wrapper div
  const playerRef = useRef(null); // video.js player instance
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  const fill = useMemo(
    () => (duration ? (current / duration) * 100 : 0),
    [current, duration]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    // 1) Create a fresh <video> element each mount
    const videoEl = document.createElement("video");
    videoEl.className = "video-js vjs-default-skin";
    videoEl.setAttribute("playsinline", "");
    containerRef.current.appendChild(videoEl);

    // 2) Init video.js
    const player = videojs(videoEl, {
      controls: false, // custom controls
      preload: "auto",
      responsive: true,
      aspectRatio: "16:9",
    });
    playerRef.current = player;

    player.src({ src: SRC, type: "video/mp4" });
    player.poster(POSTER);

    const onLoaded = () => {
      setDuration(player.duration() || 0);
      setCurrent(player.currentTime() || 0);
      setRate(player.playbackRate());
    };
    const onTime = () => setCurrent(player.currentTime() || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onRate = () => setRate(player.playbackRate());

    player.on("loadedmetadata", onLoaded);
    player.on("durationchange", onLoaded);
    player.on("timeupdate", onTime);
    player.on("play", onPlay);
    player.on("pause", onPause);
    player.on("ratechange", onRate);
    player.on("ended", onPause);

    // 3) Cleanup: dispose AND clear wrapper so StrictMode remount works
    return () => {
      try {
        player.dispose();
      } catch {}
      if (containerRef.current) {
        containerRef.current.innerHTML = ""; // remove the <video> that dispose removed
      }
      playerRef.current = null;
    };
  }, []);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    p.paused() ? p.play() : p.pause();
  };
  const seek = (v) => playerRef.current && playerRef.current.currentTime(v);
  const full = () => {
    const p = playerRef.current;
    if (!p) return;
    p.isFullscreen() ? p.exitFullscreen() : p.requestFullscreen();
  };
  const setSpeed = (s) =>
    playerRef.current && playerRef.current.playbackRate(s);

  return (
    <div style={styles.frame}>
      <div style={styles.grid}>
        {/* This wrapper will always contain a fresh <video> after mount */}
        <div style={styles.videoWrap} ref={containerRef} />

        <div style={styles.speedPanel}>
          <h4 style={{ margin: 0, textAlign: "center" }}>Speed</h4>
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              onClick={() => setSpeed(sp)}
              style={{
                ...styles.speedBtn,
                ...(rate === sp ? styles.speedBtnActive : {}),
              }}
            >
              {sp}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.time}>
          {fmt(current)} / {fmt(duration)}
        </div>
        <button style={styles.iconBtn} onClick={togglePlay}>
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={current}
          onChange={(e) => seek(Number(e.target.value))}
          style={{
            ...styles.range,
            background: `linear-gradient(90deg, #2d62ff ${fill}%, #b9c3da 0%)`,
          }}
        />
        <button style={styles.iconBtn} onClick={full}>
          ⤢
        </button>
      </div>
    </div>
  );
}

const styles = {
  frame: {
    background: "#f7f7f9",
    width: "min(1100px, 96vw)",
    borderRadius: 16,
    padding: 18,
    margin: "16px auto",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 140px",
    gap: 16,
    alignItems: "start",
  },
  videoWrap: {
    borderRadius: 12,
    border: "6px solid #ffd400",
    overflow: "hidden",
    background: "#000",
    position: "relative",
  },
  speedPanel: {
    display: "grid",
    gap: 8,
    background: "#e9ebf3",
    borderRadius: 16,
    padding: 10,
  },
  speedBtn: {
    border: 0,
    borderRadius: 10,
    padding: "10px 0",
    background: "#cfd6e7",
    color: "#182026",
    fontWeight: 700,
    cursor: "pointer",
  },
  speedBtnActive: {
    background: "#2d62ff",
    color: "#fff",
    boxShadow: "0 0 0 3px rgba(45,98,255,.18) inset",
  },
  controls: {
    marginTop: 14,
    background: "#dfe3ee",
    borderRadius: 16,
    padding: 12,
    display: "grid",
    gridTemplateColumns: "auto auto 1fr auto",
    gap: 12,
    alignItems: "center",
  },
  time: { fontWeight: 700, color: "#2b2f36", minWidth: 120 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: 0,
    background: "#cfd6e7",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
  },
  range: {
    width: "100%",
    height: 6,
    outline: "none",
    borderRadius: 999,
    appearance: "none",
  },
};
