import { useRef, useState } from "react";
import jsQR from "jsqr";

export default function CustomQrScanner({
  onResult,
}: {
  onResult?: (data: string) => void;
}) {
  const hasScannedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const [zoomValue, setZoomValue] = useState(1);
  const scanIntervalRef = useRef<number | null>(null);

  const startScanner = async () => {
    hasScannedRef.current = false;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: "environment" } },
    });

    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      video.setAttribute("playsInline", "true");
      await video.play();

      const [videoTrack] = stream.getVideoTracks();
      const capabilities =
        videoTrack.getCapabilities() as MediaTrackCapabilities & {
          zoom?: { min: number; max: number; step?: number };
        };

      if (capabilities.zoom) {
        setZoomSupported(true);
        setZoomValue(capabilities.zoom.min);
      }

      setTrack(videoTrack);
      setScannerStarted(true);

      scanIntervalRef.current = window.setInterval(() => {
        const canvas = canvasRef.current;
        if (!canvas || !video) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );

        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
        if (qrCode && qrCode.data && !hasScannedRef.current) {
          console.log("QR Found:", qrCode.data);
          hasScannedRef.current = true; // block further scans
          if (onResult) onResult(qrCode.data);
          stopScanner(); // stop camera + cleanup
        }
      }, 500);
    }
  };

  const stopScanner = () => {
    setScannerStarted(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setTrack(null);
    setZoomSupported(false);
  };

  const toggleScanner = () => {
    if (scannerStarted) {
      stopScanner();
    } else {
      startScanner();
    }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoomValue(newZoom);
    if (track) {
      track
        .applyConstraints({ advanced: [{}] })
        .catch((err) => console.warn("Zoom error:", err));
    }
  };

  return (
    <div>
      <button onClick={toggleScanner}>
        {scannerStarted ? "Stop Scanning" : "Start Scanning"}
      </button>

      <video
        ref={videoRef}
        style={{
          width: "100%",
          maxHeight: 400,
          display: scannerStarted ? "block" : "none",
        }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {zoomSupported && scannerStarted && (
        <div style={{ marginTop: "1rem" }}>
          <label>Zoom:</label>
          <input
            type="range"
            min="1"
            max="5"
            step="0.1"
            value={zoomValue}
            onChange={handleZoomChange}
          />
        </div>
      )}
    </div>
  );
}
