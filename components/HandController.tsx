import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createHandLandmarker, detectHands, getCursorPosition, isPinching } from '../services/handTracking';
import { HandInputData } from '../utils/types';

interface HandControllerProps {
    onUpdate: (data: HandInputData) => void;
    enabled: boolean;
}

export const HandController: React.FC<HandControllerProps> = ({ onUpdate, enabled }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const requestRef = useRef<number>();
    const [isLoaded, setIsLoaded] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [isRequestingPermission, setIsRequestingPermission] = useState(false);

    const predictWebcam = useCallback(() => {
        if (!videoRef.current) return;
        
        const startTimeMs = performance.now();
        const results = detectHands(videoRef.current, startTimeMs);
        
        if (results && results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const pinching = isPinching(landmarks);
            const cursor = getCursorPosition(landmarks, window.innerWidth, window.innerHeight);
            
            onUpdate({
                cursor,
                isPinching: pinching,
                isDetected: true
            });
        } else {
            onUpdate({
                cursor: { x: 0, y: 0 },
                isPinching: false,
                isDetected: false
            });
        }

        requestRef.current = requestAnimationFrame(predictWebcam);
    }, [onUpdate]);

    const requestCameraAccess = useCallback(async () => {
        setIsRequestingPermission(true);
        setPermissionError(null);
        
        try {
            // Check if running on HTTPS or localhost (required for camera access)
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                throw new Error('Camera access requires HTTPS. Please use a secure connection or localhost.');
            }

            // Check if mediaDevices is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not available in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
            }

            // Check camera permissions first (optional, not supported in all browsers)
            let permissionStatus: PermissionStatus | null = null;
            try {
                permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
                // If permission is denied, show helpful message
                if (permissionStatus.state === 'denied') {
                    throw new Error('Camera permission denied. Please click the camera icon in your browser address bar to allow access.');
                }
            } catch (e) {
                // Some browsers don't support permissions.query for camera
                // We'll handle this in the getUserMedia catch block instead
                console.log('Camera permissions query not supported, will handle in getUserMedia');
            }

            await createHandLandmarker();
            setIsLoaded(true);
            
            // Start Camera with more flexible constraints
            const constraints = {
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    facingMode: 'user'
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.addEventListener("loadeddata", predictWebcam);
            }
        } catch (err: any) {
            console.error("Error initializing hand tracking:", err);
            
            let errorMessage = 'Camera access failed';
            
            if (err.name === 'NotAllowedError' || err.message.includes('permission denied')) {
                errorMessage = 'Camera permission denied. Click the camera icon in your browser address bar to allow access.';
            } else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
                errorMessage = 'No camera found. Please connect a camera and try again.';
            } else if (err.name === 'NotReadableError' || err.message.includes('already in use')) {
                errorMessage = 'Camera is already in use by another application.';
            } else if (err.name === 'OverconstrainedError' || err.message.includes('constraints')) {
                errorMessage = 'Camera does not support the required settings.';
            } else if (err.message.includes('not available')) {
                errorMessage = 'Camera API not available. Please use a modern browser like Chrome, Firefox, or Safari.';
            } else {
                errorMessage = err.message || 'Unknown camera error occurred.';
            }
            
            setPermissionError(errorMessage);
        } finally {
            setIsRequestingPermission(false);
        }
    }, [predictWebcam]);

    useEffect(() => {
        if (!enabled) return;

        let active = true;

        const init = async () => {
            await requestCameraAccess();
        };

        init();

        return () => {
            active = false;
            if (videoRef.current) {
                videoRef.current.removeEventListener("loadeddata", predictWebcam);
                if (videoRef.current.srcObject) {
                    const stream = videoRef.current.srcObject as MediaStream;
                    const tracks = stream.getTracks();
                    tracks.forEach(track => track.stop());
                }
            }
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, requestCameraAccess, predictWebcam]);

    if (!enabled) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none opacity-90">
            {permissionError && (
                 <div className="bg-red-500 metallic-white p-3 rounded mb-2 text-xs font-bold max-w-xs">
                    📷 {permissionError}
                    <div className="mt-2 text-xs opacity-90">
                        💡 <strong>How to fix:</strong><br/>
                        1. Click the camera icon 📷 in your address bar<br/>
                        2. Select "Allow" for camera access<br/>
                        3. Reload this page
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button 
                            onClick={requestCameraAccess}
                            disabled={isRequestingPermission}
                            className="flex-1 bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded px-2 py-1 text-center transition-colors pointer-events-auto"
                        >
                            {isRequestingPermission ? 'Requesting...' : 'Request Camera'}
                        </button>
                        <button 
                            onClick={() => window.location.reload()}
                            className="flex-1 bg-white/20 hover:bg-white/30 rounded px-2 py-1 text-center transition-colors pointer-events-auto"
                        >
                            Reload Page
                        </button>
                    </div>
                 </div>
            )}
            {!isLoaded && !permissionError && (
                <div className="bg-yellow-500 metallic-white p-2 rounded mb-2 text-xs font-bold animate-pulse">
                    Loading AI Model...
                </div>
            )}
            {isLoaded && (
                <div className="relative rounded-lg overflow-hidden border-2 border-green-500 w-32 h-24 bg-black shadow-lg">
                     {/* Video is mirrored for natural interaction */}
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] metallic-white p-1 text-center">
                        Pinch to Drag
                    </div>
                </div>
            )}
        </div>
    );
};