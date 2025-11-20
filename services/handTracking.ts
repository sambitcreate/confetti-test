import {
  FilesetResolver,
  HandLandmarker,
  HandLandmarkerResult
} from "@mediapipe/tasks-vision";

let handLandmarker: HandLandmarker | undefined;
let runningMode: "IMAGE" | "VIDEO" = "VIDEO";

export const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numHands: 1
  });
  
  return handLandmarker;
};

export const detectHands = (
  video: HTMLVideoElement, 
  startTimeMs: number
): HandLandmarkerResult | null => {
  if (!handLandmarker) return null;
  return handLandmarker.detectForVideo(video, startTimeMs);
};

/**
 * Calculates distance between two 3D points
 */
export const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    const a = p1.x - p2.x;
    const b = p1.y - p2.y;
    return Math.sqrt(a * a + b * b);
}

/**
 * Determines if the user is pinching based on Index finger tip (8) and Thumb tip (4)
 */
export const isPinching = (landmarks: any[]) => {
    if (!landmarks || landmarks.length === 0) return false;
    
    // Landmarks are normalized [0, 1].
    // Thumb tip is index 4, Index tip is index 8
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    
    // Distance threshold for a pinch (tunable)
    const distance = getDistance(thumbTip, indexTip);
    return distance < 0.1; // 0.1 is a heuristic relative value
};

/**
 * Gets the cursor position from landmarks (using Index Finger Tip)
 * Maps normalized coordinates to screen coordinates.
 */
export const getCursorPosition = (landmarks: any[], screenWidth: number, screenHeight: number) => {
    if (!landmarks || landmarks.length === 0) return { x: 0, y: 0 };
    
    const indexTip = landmarks[8];
    
    // Mirror X axis because webcam is mirrored
    return {
        x: (1 - indexTip.x) * screenWidth,
        y: indexTip.y * screenHeight
    };
}