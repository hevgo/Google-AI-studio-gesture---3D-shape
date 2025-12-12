import React, { useEffect, useRef } from 'react';
import { HandState } from '../types';

// Define types for global MediaPipe Hands
declare global {
  class Hands {
    constructor(config: { locateFile: (file: string) => string });
    setOptions(options: {
      maxNumHands: number;
      modelComplexity: number;
      minDetectionConfidence: number;
      minTrackingConfidence: number;
    }): void;
    onResults(callback: (results: MPResults) => void): void;
    send(input: { image: HTMLVideoElement }): Promise<void>;
    close(): void;
  }
}

interface MPResults {
  multiHandLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
}

interface HandControllerProps {
  onHandUpdate: (state: HandState) => void;
  onClap: () => void;
}

const HandController: React.FC<HandControllerProps> = ({ onHandUpdate, onClap }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const requestRef = useRef<number>(0);
  const isMounted = useRef<boolean>(true);
  
  // Interaction State Refs
  const lastClapTime = useRef<number>(0);

  useEffect(() => {
    isMounted.current = true;

    if (typeof Hands === 'undefined') {
      console.error('MediaPipe Hands library not loaded');
      return;
    }

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2, // Enable 2 hands for interaction
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results: MPResults) => {
      if (!isMounted.current) return;

      // --- VISUAL OVERLAY ---
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
              // Ensure canvas buffer size matches display size
              if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                  canvas.width = canvas.clientWidth;
                  canvas.height = canvas.clientHeight;
              }

              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              if (results.multiHandLandmarks) {
                  ctx.globalAlpha = 0.1; // 10% transparency
                  ctx.strokeStyle = 'gray';
                  ctx.fillStyle = 'gray';
                  
                  for (const landmarks of results.multiHandLandmarks) {
                      drawHandOverlay(ctx, landmarks, canvas.width, canvas.height);
                  }
              }
          }
      }

      // --- LOGIC ---
      const numHands = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;
      const isCurrentlyDetected = numHands > 0;
      const now = Date.now();

      // --- TRIGGER: Hands Close Together (Explode & Switch) ---
      if (numHands === 2) {
        const hand1 = results.multiHandLandmarks[0];
        const hand2 = results.multiHandLandmarks[1];
        
        // Calculate Centroids for better stability than single joint
        const getCentroid = (landmarks: {x: number, y: number}[]) => {
            let x = 0, y = 0;
            for(const p of landmarks) { x += p.x; y += p.y; }
            return { x: x / landmarks.length, y: y / landmarks.length };
        };

        const c1 = getCentroid(hand1);
        const c2 = getCentroid(hand2);
        
        const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
        
        // Logic: Hands are close together
        // Threshold lowered to 0.12 (approx palm width overlap) for accuracy
        const PROXIMITY_THRESHOLD = 0.12;
        
        if (dist < PROXIMITY_THRESHOLD) {
            if (now - lastClapTime.current > 1000) {
                lastClapTime.current = now;
                onClap();
            }
        }
      }

      // --- Hand State Calculation (Control Logic) ---
      // Always uses the first detected hand for manipulation
      if (isCurrentlyDetected) {
        const hand = results.multiHandLandmarks[0]; 
        
        // Calculate Pinch (Thumb tip vs Index tip)
        const thumbTip = hand[4];
        const indexTip = hand[8];
        const pinchDist = Math.sqrt(
          Math.pow(thumbTip.x - indexTip.x, 2) + 
          Math.pow(thumbTip.y - indexTip.y, 2)
        );
        const isPinching = pinchDist < 0.05;

        // Calculate Position
        // If pinching, use the midpoint of the pinch (Thumb tip + Index tip / 2)
        // If not pinching, use the palm center (Middle finger knuckle, idx 9)
        let targetX = hand[9].x;
        let targetY = hand[9].y;

        if (isPinching) {
            targetX = (thumbTip.x + indexTip.x) / 2;
            targetY = (thumbTip.y + indexTip.y) / 2;
        }

        // Calculate Openness (Average distance of fingertips to wrist)
        const wrist = hand[0];
        const tips = [8, 12, 16, 20];
        let totalDist = 0;
        
        tips.forEach(idx => {
          const tip = hand[idx];
          totalDist += Math.sqrt(
            Math.pow(tip.x - wrist.x, 2) + 
            Math.pow(tip.y - wrist.y, 2)
          );
        });
        
        const avgDist = totalDist / 4;
        const minOpen = 0.15;
        const maxOpen = 0.40;
        const openness = Math.min(Math.max((avgDist - minOpen) / (maxOpen - minOpen), 0), 1);

        onHandUpdate({
          isDetected: true,
          position: { x: targetX, y: targetY },
          isPinching,
          openness
        });

      } else {
        onHandUpdate({
          isDetected: false,
          position: { x: 0.5, y: 0.5 },
          isPinching: false,
          openness: 0
        });
      }
    });

    handsRef.current = hands;

    const startCamera = async () => {
        if (!videoRef.current) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    loop();
                };
            }
        } catch (e) {
            console.error("Failed to start camera:", e);
        }
    };

    const loop = async () => {
        if (!isMounted.current) return;
        
        if (videoRef.current && handsRef.current && videoRef.current.readyState >= 2) {
             try {
                await handsRef.current.send({ image: videoRef.current });
             } catch (error) {
                 // Ignore shutdown errors
                 if (isMounted.current) console.warn("MediaPipe send error:", error);
             }
        }
        
        if (isMounted.current) {
            requestRef.current = requestAnimationFrame(loop);
        }
    };

    startCamera();

    return () => {
        isMounted.current = false;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (handsRef.current) {
            // Attempt to close safely
            try {
                handsRef.current.close();
            } catch (e) {
                console.error("Error closing Hands:", e);
            }
            handsRef.current = null;
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [onHandUpdate, onClap]);

  return (
    <>
        <canvas 
            ref={canvasRef} 
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-30" 
        />
        <div className="absolute top-4 right-4 z-50 opacity-80 hover:opacity-100 transition-opacity">
            <video
                ref={videoRef}
                className="w-32 h-24 object-cover rounded-lg border-2 border-slate-600 scale-x-[-1]"
                playsInline
                muted
            />
            <div className="text-xs text-center mt-1 text-slate-400">Camera Feed</div>
        </div>
    </>
  );
};

// Helper to draw hand skeleton
const drawHandOverlay = (ctx: CanvasRenderingContext2D, landmarks: {x:number, y:number}[], w: number, h: number) => {
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const fingers = [
        [0, 1, 2, 3, 4], // Thumb
        [0, 5, 6, 7, 8], // Index
        [0, 9, 10, 11, 12], // Middle
        [0, 13, 14, 15, 16], // Ring
        [0, 17, 18, 19, 20] // Pinky
    ];

    // Draw Bones
    ctx.beginPath();
    for (const finger of fingers) {
        for (let i = 0; i < finger.length - 1; i++) {
             const start = landmarks[finger[i]];
             const end = landmarks[finger[i+1]];
             // Mirror X coordinate (1 - x) to match screen interaction
             ctx.moveTo((1 - start.x) * w, start.y * h);
             ctx.lineTo((1 - end.x) * w, end.y * h);
        }
    }
    // Palm connections
    const palm = [5, 9, 13, 17, 0];
    for (let i = 0; i < palm.length - 1; i++) {
         const start = landmarks[palm[i]];
         const end = landmarks[palm[i+1]];
         ctx.moveTo((1 - start.x) * w, start.y * h);
         ctx.lineTo((1 - end.x) * w, end.y * h);
    }
    // Close palm loop
    const pStart = landmarks[17];
    const pEnd = landmarks[5]; 
    ctx.stroke();

    // Draw Joints
    for (const lm of landmarks) {
        ctx.beginPath();
        ctx.arc((1 - lm.x) * w, lm.y * h, 6, 0, 2 * Math.PI);
        ctx.fill();
    }
};

export default HandController;