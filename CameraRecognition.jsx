import { useRef, useEffect, useState } from "react";
import axios from "axios";
import * as faceapi from "face-api.js";

function CameraRecognition({ onClose, onCapture, captureMode }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  const [recognizedName, setRecognizedName] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("");
  const [attendanceList, setAttendanceList] = useState([]);

  useEffect(() => {
    startCamera();
    loadModels();
    const interval = setInterval(() => detectFace(), 500);
    return () => {
      stopCamera();
      clearInterval(interval);
    };
  }, []);

  const loadModels = async () => {
    const MODEL_URL = "/models/tiny_face_detector";
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log("✅ Model loaded from", MODEL_URL);
    } catch (err) {
      console.error("🚨 Error loading model:", err);
    }
  };

  const detectFace = async () => {
    if (!videoRef.current) return;

    const options = new faceapi.TinyFaceDetectorOptions();
    const detection = await faceapi.detectSingleFace(videoRef.current, options);

    if (detection) {
      const { box } = detection;
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;

      const diffX = centerX - videoWidth / 2;
      const diffY = centerY - videoHeight / 2;

      let message = "✅ Face centered!";
      if (Math.abs(diffX) > 60) message = diffX > 0 ? "❌ Move left" : "❌ Move right";
      else if (Math.abs(diffY) > 60) message = diffY > 0 ? "❌ Move up" : "❌ Move down";
      else if (box.width < 100) message = "❌ Move closer";
      else if (box.width > 250) message = "❌ Move farther";

      setFeedback(message);
      if (overlayRef.current) {
        overlayRef.current.style.borderColor = message === "✅ Face centered!" ? "#10b981" : "#f87171";
      }
    } else {
      setFeedback("❌ No face detected");
      if (overlayRef.current) {
        overlayRef.current.style.borderColor = "#f87171";
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("❌ Error accessing webcam:", err);
    }
  };

  const stopCamera = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }

    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setScanning(false);
    setRecognizedName(null);
    setCapturedImages([]);
    setFeedback("");
    setMessage("");

    if (overlayRef.current) {
      overlayRef.current.style.borderColor = "#10b981";
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const base64DataUrl = canvas.toDataURL("image/jpeg");

    if (captureMode === "addUser") {
      const newImages = [...capturedImages, base64DataUrl];
      setCapturedImages(newImages);
      if (newImages.length === 5) {
        onCapture(newImages);
        setCapturedImages([]);
        stopCamera();
        onClose();
      }
    } else {
      onCapture([base64DataUrl]);
      stopCamera();
      onClose();
    }
  };

  const handleRecognition = async () => {
    const imageData = canvasRef.current.toDataURL("image/jpeg");

    try {
      const res = await axios.post("http://127.0.0.1:5000/api/recognize", {
        image: imageData,
      });

      if (res.data.status === "success") {
        setRecognizedName(res.data.name);
        
        if (!res.data.already_marked) {
          setMessage(`✅ ${res.data.name} marked present at ${new Date(res.data.time).toLocaleTimeString()}`);
          // Update attendance list in parent component
          onCapture([res.data.imageUrl]);
        } else {
          setMessage(`ℹ️ ${res.data.name} already marked today`);
        }

        // Stop scanning after recognition
        clearInterval(intervalId);
        setIntervalId(null);
        setScanning(false);

        // Auto-close after 3 seconds if marked, stay open if already marked
        if (!res.data.already_marked) {
          setTimeout(() => {
            stopCamera();
            onClose();
          }, 3000);
        }
      } else {
        setRecognizedName("❌ Not Recognized");
        setMessage(res.data.message || "❌ No match found.");
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Face not detected or error occurred.");
    }
  };

  const processRecognition = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    await handleRecognition();
  };

  const startRealTimeRecognition = () => {
    if (intervalId) return;
    setScanning(true);
    const id = setInterval(() => {
      processRecognition();
    }, 3000);
    setIntervalId(id);
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
      <div className="bg-gray-900 p-4 rounded-lg shadow-lg relative">
        <h2 className="text-white text-2xl text-center mb-2">Face Recognition</h2>

        <div className="relative w-full max-w-lg mx-auto">
          <video ref={videoRef} autoPlay className="rounded-lg border border-gray-500" />

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              WebkitMaskImage:
                "radial-gradient(ellipse 30% 42% at center, transparent 0%, black 100%)",
              maskImage:
                "radial-gradient(ellipse 30% 42% at center, transparent 0%, black 100%)",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
            }}
          ></div>

          <div
            ref={overlayRef}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-4 border-green-400 pointer-events-none transition-colors duration-300"
            style={{
              width: "12rem",
              height: "16rem",
              borderRadius: "50% / 40%",
            }}
          ></div>
        </div>

        <canvas ref={canvasRef} className="hidden"></canvas>

        <div className="flex justify-center gap-4 mt-4">
          <button
            className="bg-red-500 px-4 py-2 rounded-md text-white"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            Close Camera
          </button>

          {captureMode === "attendance" && !scanning ? (
            <button className="bg-blue-500 px-4 py-2 rounded-md text-white" onClick={startRealTimeRecognition}>
              Start Recognition
            </button>
          ) : scanning ? (
            <span className="text-green-400 text-xl">🔄 Scanning...</span>
          ) : (
            <button className="bg-yellow-500 px-4 py-2 rounded-md text-white" onClick={captureImage}>
              {captureMode === "addUser" ? `Capture Image (${capturedImages.length + 1}/5)` : "Capture Image"}
            </button>
          )}
        </div>

        {feedback && <p className="text-center text-yellow-400 mt-2 text-lg">{feedback}</p>}
        {message && <p className="text-center text-blue-400 mt-2 text-md">{message}</p>}
        {recognizedName && (
          <p className="text-center text-white mt-4 text-xl">
            {recognizedName === "❌ Not Recognized" ? "❌ Face not recognized" : `✅ Recognized: ${recognizedName}`}
          </p>
        )}
      </div>
    </div>
  );
}

export default CameraRecognition;