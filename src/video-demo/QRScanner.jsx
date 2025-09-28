import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import jsQR from "jsqr";

const QRScannerButton = ({ onResult }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const hasScannedRef = useRef(false);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [track, setTrack] = useState(null);
  const [zoomValue, setZoomValue] = useState(1);

  useEffect(() => {
    return () => {
      stopScanner(); // cleanup when unmount
    };
  }, []);

  const startScanner = async () => {
    // const stream = await navigator.mediaDevices.getUserMedia({
    //     video: { facingMode: { exact: "environment" } },
    // });

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      video.setAttribute("playsInline", "true");
      await video.play();

      const [videoTrack] = stream.getVideoTracks();
      const capabilities = videoTrack.getCapabilities();
      if (capabilities.zoom) {
        setZoomSupported(true);
        setZoomValue(capabilities.zoom.min);
      }

      setTrack(videoTrack);
      hasScannedRef.current = false;
      setScannerStarted(true);

      scanIntervalRef.current = setInterval(() => {
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
          hasScannedRef.current = true;
          if (onResult) onResult(qrCode.data);
          stopScanner(); // stop after one successful scan
        }
      }, 500);
    }
  };

  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScannerStarted(false);
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

  const handleZoomChange = (e) => {
    const newZoom = parseFloat(e.target.value);
    setZoomValue(newZoom);
    if (track) {
      track
        .applyConstraints({ advanced: [{ zoom: newZoom }] })
        .catch(console.warn);
    }
  };

  return (
    <>
      <button
        className="btn"
        onClick={toggleScanner}
        style={{
          fontSize: "1.25rem",
          border: "1px solid #EAE8F1",
          padding: ".4375rem",
          marginRight: ".5rem",
        }}
      >
        <i className="fa-regular fa-qrcode"></i>
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
    </>
  );
};

QRScannerButton.propTypes = {
  onResult: PropTypes.func,
};

export default QRScannerButton;
