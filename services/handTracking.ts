import {
  FilesetResolver,
  HandLandmarker,
  HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

let handLandmarker: HandLandmarker | undefined;
let handLandmarkerPromise: Promise<HandLandmarker> | null = null;

export const createHandLandmarker = async (): Promise<HandLandmarker> => {
  if (handLandmarker) return handLandmarker;
  if (handLandmarkerPromise) return handLandmarkerPromise;

  handLandmarkerPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
    );

    const instance = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 1,
    });

    handLandmarker = instance;
    return instance;
  })();

  try {
    return await handLandmarkerPromise;
  } finally {
    handLandmarkerPromise = null;
  }
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
export const isPinching = (landmarks: any[], wasPinching: boolean = false) => {
    if (!landmarks || landmarks.length === 0) return false;
    
    // Landmarks are normalized [0, 1].
    // Thumb tip is index 4, Index tip is index 8
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    
    // Hysteresis thresholds to avoid flicker
    const START_THRESHOLD = 0.14;
    const RELEASE_THRESHOLD = 0.18;
    const distance = getDistance(thumbTip, indexTip);
    return wasPinching ? distance < RELEASE_THRESHOLD : distance < START_THRESHOLD;
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
