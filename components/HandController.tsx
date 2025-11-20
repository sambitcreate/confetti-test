import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  createHandLandmarker,
  detectHands,
  getCursorPosition,
  isPinching,
} from '@/services/handTracking';
import { HandInputData } from '@/utils/types';

interface HandControllerProps {
    onUpdate: (data: HandInputData) => void;
    enabled: boolean;
}

export const HandController: React.FC<HandControllerProps> = ({ onUpdate, enabled }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const requestRef = useRef<number>();
    const isRequestingPermissionRef = useRef(false);
    const loadedDataHandlerRef = useRef<(() => void) | null>(null);
    const handStateRef = useRef({
        isPinching: false,
        lastCursor: { x: 0, y: 0 },
        lastDetectedAt: 0
    });
    const [isLoaded, setIsLoaded] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [isRequestingPermission, setIsRequestingPermission] = useState(false);

    const predictWebcam = useCallback(() => {
        if (!videoRef.current) return;

        const startTimeMs = performance.now();
        const results = detectHands(videoRef.current, startTimeMs);
        const now = performance.now();

        if (results && results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const pinching = isPinching(landmarks, handStateRef.current.isPinching);
            const cursor = getCursorPosition(landmarks, window.innerWidth, window.innerHeight);

            handStateRef.current.isPinching = pinching;
            handStateRef.current.lastCursor = cursor;
            handStateRef.current.lastDetectedAt = now;

            onUpdate({
                cursor,
                isPinching: pinching,
                isDetected: true
            });
        } else {
            const delta = now - handStateRef.current.lastDetectedAt;
            const stillDetected = delta < 140;

            if (!stillDetected) {
                handStateRef.current.isPinching = false;
            }

            onUpdate({
                cursor: handStateRef.current.lastCursor,
                isPinching: handStateRef.current.isPinching,
                isDetected: stillDetected
            });
        }

        requestRef.current = requestAnimationFrame(predictWebcam);
    }, [onUpdate]);

    const handleVideoLoadedData = useCallback(() => {
        setIsStreaming(true);

        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = undefined;
        }

        predictWebcam();
    }, [predictWebcam]);

    const requestCameraAccess = useCallback(async () => {
        if (isRequestingPermissionRef.current) return;

        isRequestingPermissionRef.current = true;
        setIsRequestingPermission(true);
        setPermissionError(null);
        setIsStreaming(false);
        
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
                if (loadedDataHandlerRef.current) {
                    videoRef.current.removeEventListener("loadeddata", loadedDataHandlerRef.current);
                }

                loadedDataHandlerRef.current = handleVideoLoadedData;

                if (videoRef.current.srcObject) {
                    const existingStream = videoRef.current.srcObject as MediaStream;
                    existingStream.getTracks().forEach(track => track.stop());
                }

                videoRef.current.srcObject = stream;
                videoRef.current.addEventListener("loadeddata", handleVideoLoadedData);
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
            setIsStreaming(false);
        } finally {
            isRequestingPermissionRef.current = false;
            setIsRequestingPermission(false);
        }
    }, [handleVideoLoadedData, predictWebcam]);

    useEffect(() => {
        if (!enabled) return;

        const init = async () => {
            await requestCameraAccess();
        };

        init();

        return () => {
            if (videoRef.current) {
                if (loadedDataHandlerRef.current) {
                    videoRef.current.removeEventListener("loadeddata", loadedDataHandlerRef.current);
                }
                if (videoRef.current.srcObject) {
                    const stream = videoRef.current.srcObject as MediaStream;
                    const tracks = stream.getTracks();
                    tracks.forEach(track => track.stop());
                    videoRef.current.srcObject = null;
                }
            }
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = undefined;
            }
            setIsStreaming(false);
        };
    }, [enabled, requestCameraAccess]);

    if (!enabled) return null;

    return (
        <>
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-black" />
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`absolute inset-0 h-full w-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
                        isStreaming ? 'opacity-90' : 'opacity-30'
                    }`}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/70" />
            </div>

            <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none opacity-95">
                {permissionError && (
                    <div className="bg-white/10 border border-white/25 text-white p-3 rounded text-xs font-semibold max-w-xs backdrop-blur pointer-events-auto shadow-lg">
                        <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            <span>{permissionError}</span>
                        </div>
                        <div className="mt-2 text-xs opacity-90 leading-relaxed">
                            • Click the camera icon in the address bar<br/>
                            • Allow camera access<br/>
                            • Reload this page
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={requestCameraAccess}
                                disabled={isRequestingPermission}
                                className="flex-1 border border-white/30 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded px-2 py-1 text-center transition-colors pointer-events-auto"
                            >
                                {isRequestingPermission ? 'Requesting...' : 'Request Camera'}
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 border border-white/30 bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-center transition-colors pointer-events-auto"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                )}

                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] pointer-events-auto">
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${
                            isStreaming ? 'bg-white' : 'bg-white/60 animate-pulse'
                        }`}
                    />
                    <span className="metallic-white">
                        {permissionError
                            ? 'Camera blocked'
                            : isStreaming
                                ? 'Hand camera live'
                                : isLoaded
                                    ? 'Waiting for camera'
                                    : 'Loading hand AI'}
                    </span>
                </div>
            </div>
        </>
    );
};
