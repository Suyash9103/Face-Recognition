import { useEffect } from "react";

function CanvasBackground() {
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    Promise.all([
      loadScript("/js/noise.min.js"),
      loadScript("/js/util.js"),
      loadScript("/js/coalesce.js"),
    ]).then(() => {
      console.log("Coalesce Background Loaded");
    }).catch((error) => {
      console.error("Failed to load background scripts:", error);
    });

    return () => {
      document.querySelectorAll("script[src*='/js/']").forEach((script) => script.remove());
    };
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full h-full">
      <canvas id="bgCanvas"></canvas>
    </div>
  );
}

export default CanvasBackground;

