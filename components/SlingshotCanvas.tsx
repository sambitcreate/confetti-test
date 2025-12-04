import React, { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { HandController } from "@/components/HandController";
import {
  PRELOAD_IMAGES_SRC,
  EXPLOSION_IMAGES_SRC,
  AssetMap,
  HandInputData,
} from "@/utils/types";

gsap.registerPlugin(Observer);

// Helper to clone SVG nodes safely
const createSVGElement = (tag: string) =>
  document.createElementNS("http://www.w3.org/2000/svg", tag);

const pickRandomKey = (keys: string[]) =>
  keys[Math.floor(Math.random() * keys.length)];

export const SlingshotCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<SVGSVGElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);
  const releaseTimeoutRef = useRef<number | null>(null);

  // Element Refs for Slingshot Parts
  const rockRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<HTMLImageElement>(null);
  const handleRef = useRef<HTMLImageElement>(null);
  const instructionsRef = useRef<HTMLElement>(null);

  // State
  const [isHandMode, setIsHandMode] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Logic Refs (Mutable state for animation loop)
  const state = useRef({
    isDrawing: false,
    startX: 0,
    startY: 0,
    lastDistance: 0,
    imageMap: {} as AssetMap,
    imageKeys: [] as string[],
    explosionMap: {} as AssetMap,
    explosionKeys: [] as string[],
    currentLine: null as SVGLineElement | null,
    startImage: null as SVGImageElement | null,
    circle: null as SVGCircleElement | null,
    handPos: { x: 0, y: 0 },
  });

  // GSAP Setters
  const xSetter = useRef<((value: number) => void) | null>(null);
  const ySetter = useRef<((value: number) => void) | null>(null);

  // --- Initialization ---
  useEffect(() => {
    let isMounted = true;

    // Preload Images
    const loadImages = async () => {
      const load = (src: string) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
        });

      const imgMap: AssetMap = {};
      const imgKeys: string[] = [];
      const expMap: AssetMap = {};
      const expKeys: string[] = [];

      await Promise.all([
        ...PRELOAD_IMAGES_SRC.map(async (p) => {
          const img = await load(p.src);
          if (img) {
            imgMap[p.key] = img;
            imgKeys.push(p.key);
          }
        }),
        ...EXPLOSION_IMAGES_SRC.map(async (p) => {
          const img = await load(p.src);
          if (img) {
            expMap[p.key] = img;
            expKeys.push(p.key);
          }
        }),
      ]);

      if (!isMounted) return;

      state.current.imageMap = imgMap;
      state.current.imageKeys = imgKeys;
      state.current.explosionMap = expMap;
      state.current.explosionKeys = expKeys;
      setAssetsLoaded(true);
    };

    loadImages();

    // Initialize Hand Setters
    if (handRef.current) {
      xSetter.current = gsap.quickTo(handRef.current, "x", { duration: 0.1 });
      ySetter.current = gsap.quickTo(handRef.current, "y", { duration: 0.1 });
      gsap.set(handRef.current, { xPercent: -50, yPercent: -50 });
    }

    return () => {
      isMounted = false;
      if (releaseTimeoutRef.current) {
        window.clearTimeout(releaseTimeoutRef.current);
        releaseTimeoutRef.current = null;
      }
    };
  }, []);

  // --- Animation & Logic Methods ---

  const createExplosion = useCallback(
    (x: number, y: number, distance: number = 100) => {
      if (!containerRef.current || !state.current.explosionKeys.length) return;

      const count = Math.round(gsap.utils.clamp(3, 40, distance / 10));
      const angleSpread = Math.PI * 2;
      const speed = gsap.utils.mapRange(0, 500, 0.3, 2.5, distance);
      const sizeRange = gsap.utils.mapRange(0, 500, 20, 60, distance);

      for (let i = 0; i < count; i++) {
        const randomKey = pickRandomKey(state.current.explosionKeys);
        const original = state.current.explosionMap[randomKey];
        if (!original) continue;

        const img = original.cloneNode(true) as HTMLImageElement;
        img.className = "absolute pointer-events-none z-10 will-change-transform";
        const size = gsap.utils.random(20, sizeRange);
        img.style.height = `${size}px`;
        img.style.left = `${x}px`;
        img.style.top = `${y}px`;
        containerRef.current.appendChild(img);

        const angle = Math.random() * angleSpread;
        const velocity = gsap.utils.random(300, 800) * speed;

        // Simulate Physics2D
        // X motion
        gsap.to(img, {
          x: Math.cos(angle) * velocity,
          duration: 1 + Math.random(),
          ease: "power1.out",
        });

        // Y motion (Velocity + Gravity)
        gsap.to(img, {
          y: Math.sin(angle) * velocity + 800, // +800 simulates gravity drop
          duration: 1 + Math.random(),
          ease: "power1.out", // Initial burst
          onComplete: () => img.remove(),
        });

        // Rotation and Opacity
        gsap.to(img, {
          rotation: gsap.utils.random(-180, 180),
          opacity: 0,
          delay: 0.5,
          duration: 0.5,
        });
      }
    },
    []
  );

  const startDrawing = useCallback(
    (x: number, y: number) => {
      if (
        state.current.isDrawing ||
        !canvasRef.current ||
        !assetsLoaded ||
        !state.current.imageKeys.length
      ) {
        return;
      }

      const randomKey = pickRandomKey(state.current.imageKeys);
      const original = state.current.imageMap[randomKey];
      if (!original) return;

      state.current.isDrawing = true;
      state.current.startX = x;
      state.current.startY = y;

      if (instructionsRef.current) gsap.to(instructionsRef.current, { opacity: 0, duration: 0.2 });
      if (dragRef.current) gsap.set(dragRef.current, { opacity: 1 });
      if (handleRef.current) gsap.set(handleRef.current, { opacity: 1 });
      if (rockRef.current) gsap.set(rockRef.current, { opacity: 0 });

      // SVG Line
      const line = createSVGElement("line") as SVGLineElement;
      line.setAttribute("x1", x.toString());
      line.setAttribute("y1", y.toString());
      line.setAttribute("x2", x.toString());
      line.setAttribute("y2", y.toString());
      line.setAttribute("stroke", "#fffce1");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-dasharray", "4");
      state.current.currentLine = line;

      // SVG Circle (Anchor)
      const circle = createSVGElement("circle") as SVGCircleElement;
      circle.setAttribute("cx", x.toString());
      circle.setAttribute("cy", y.toString());
      circle.setAttribute("r", "30");
      circle.setAttribute("fill", "#0e100f");
      state.current.circle = circle;

      // Random Content Image
      const clone = createSVGElement("image") as SVGImageElement;
      clone.setAttribute("x", (x - 25).toString());
      clone.setAttribute("y", (y - 25).toString());
      clone.setAttribute("width", "50");
      clone.setAttribute("height", "50");
      clone.setAttributeNS("http://www.w3.org/1999/xlink", "href", original.src);
      state.current.startImage = clone;

      canvasRef.current.appendChild(line);
      canvasRef.current.appendChild(circle);
      canvasRef.current.appendChild(clone);
    },
    [assetsLoaded]
  );

  const updateDrawing = useCallback((x: number, y: number) => {
    if (
      !state.current.isDrawing ||
      !state.current.currentLine ||
      !state.current.startImage ||
      !state.current.circle
    )
      return;

    const dx = x - state.current.startX;
    const dy = y - state.current.startY;
    let distance = Math.sqrt(dx * dx + dy * dy);
    const safeDistance = Math.max(distance, 0.001);

    // Visual logic from original script
    let shrink = (safeDistance - 30) / safeDistance;
    let x2 = state.current.startX + dx * shrink;
    let y2 = state.current.startY + dy * shrink;

    if (distance < 30) {
      x2 = state.current.startX;
      y2 = state.current.startY;
    }

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Update Line
    state.current.currentLine.setAttribute("x2", x2.toString());
    state.current.currentLine.setAttribute("y2", y2.toString());

    // Update Image & Circle Scale
    let raw = distance / 100;
    let eased = Math.pow(raw, 0.5);
    let clamped = gsap.utils.clamp(1, 100, eased); // Clamper logic

    gsap.set([state.current.startImage, state.current.circle], {
      scale: clamped,
      rotation: `${angle - 45}_short`, // _short ensures shortest rotation path
      transformOrigin: "center center",
    });

    // Rotate Hand
    if (handRef.current) {
      gsap.to(handRef.current, {
        rotation: `${angle - 90}_short`,
        duration: 0.1,
        ease: "none",
      });
    }

    state.current.lastDistance = distance;
  }, []);

  const endDrawing = useCallback(() => {
    if (!state.current.isDrawing) return;

    // Create Explosion
    createExplosion(
      state.current.startX,
      state.current.startY,
      state.current.lastDistance
    );

    // Reset Hand UI
    if (dragRef.current) gsap.set(dragRef.current, { opacity: 0 });
    if (handleRef.current) gsap.set(handleRef.current, { opacity: 0 });
    if (rockRef.current) gsap.set(rockRef.current, { opacity: 1 });

    // Wiggle effect for "reloading" (Simplified wiggle without custom plugin)
    if (rockRef.current) {
      gsap.fromTo(
        rockRef.current,
        { rotation: -20 },
        {
          duration: 0.5,
          rotation: 0,
          ease: "elastic.out(1, 0.3)",
          onComplete: () => {
            if (rockRef.current) gsap.set(rockRef.current, { opacity: 0 });
            if (handRef.current)
              gsap.set(handRef.current, { rotation: 0, overwrite: "auto" });
            if (instructionsRef.current)
              gsap.to(instructionsRef.current, { opacity: 1 });
            if (dragRef.current) gsap.set(dragRef.current, { opacity: 1 });
          },
        }
      );
    }

    state.current.isDrawing = false;
    state.current.lastDistance = 0;

    // Cleanup SVG
    if (canvasRef.current) canvasRef.current.innerHTML = "";
    state.current.currentLine = null;
    state.current.startImage = null;
    state.current.circle = null;
  }, [createExplosion]);

  // --- Input Handling ---

  const handleHandUpdate = useCallback(
    (data: HandInputData) => {
      if (!isHandMode) return;

      const { cursor, isPinching, isDetected } = data;

      // Update cursor/hand position
      if (xSetter.current) xSetter.current(cursor.x);
      if (ySetter.current) ySetter.current(cursor.y);

      // Show/Hide hand based on detection
      if (handRef.current) {
        gsap.to(handRef.current, { opacity: isDetected ? 1 : 0, duration: 0.2 });
      }

      // Cancel any pending release when we get a confident pinch again
      if (isDetected && isPinching && releaseTimeoutRef.current) {
        window.clearTimeout(releaseTimeoutRef.current);
        releaseTimeoutRef.current = null;
      }

      // State Machine with jitter protection: start on pinch, update while held,
      // and debounce the release to mimic the mouse drag behaviour.
      if (isDetected && isPinching) {
        if (!state.current.isDrawing) {
          startDrawing(cursor.x, cursor.y);
        }

        if (state.current.isDrawing) {
          updateDrawing(cursor.x, cursor.y);
        }

        return;
      }

      // Release if pinch opens OR detection is lost while drawing, but debounce
      // slightly to avoid flicker from minor tracking noise.
      if (state.current.isDrawing && !releaseTimeoutRef.current) {
        releaseTimeoutRef.current = window.setTimeout(() => {
          endDrawing();
          releaseTimeoutRef.current = null;
        }, 80);
      }
    },
    [isHandMode, startDrawing, updateDrawing, endDrawing]
  );

  // --- Mouse Observers ---
  useEffect(() => {
    if (isHandMode || !proxyRef.current) return;

    const observer = Observer.create({
      target: proxyRef.current,
      type: "pointer,touch",
      onMove: (e) => {
        if (xSetter.current) xSetter.current(e.x);
        if (ySetter.current) ySetter.current(e.y);
        if (handRef.current) gsap.to(handRef.current, { opacity: 1, duration: 0.2 });
      },
      onPress: (e) => startDrawing(e.x, e.y),
      onDrag: (e) => state.current.isDrawing && updateDrawing(e.x, e.y),
      onDragEnd: () => endDrawing(),
      onRelease: () => endDrawing(),
    });
    
    const mouseLeave = () => {
        if(handRef.current) gsap.to(handRef.current, { opacity: 0, duration: 0.2 });
    }
    
    containerRef.current?.addEventListener('mouseleave', mouseLeave);

    return () => {
      observer.kill();
      containerRef.current?.removeEventListener('mouseleave', mouseLeave);
    };
  }, [isHandMode, startDrawing, updateDrawing, endDrawing]);

  return (
    <div
      ref={containerRef}
      className={`relative isolate z-10 w-full h-screen flex flex-col items-center justify-center ${
        isHandMode ? "bg-black" : "bg-[#131313]"
      } text-white overflow-hidden ${
        !isHandMode ? "no-cursor" : ""
      }`}
    >
      {/* Mode + Instruction */}
      <div className="fixed top-4 left-4 z-50 flex flex-col gap-3 pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setIsHandMode(false)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${
              !isHandMode
                ? "bg-white text-black border-white/70 shadow-sm"
                : "bg-transparent text-white/70 border-white/30 hover:bg-white/10"
            }`}
          >
            Mouse
          </button>
          <button
            onClick={() => setIsHandMode(true)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${
              isHandMode
                ? "bg-white text-black border-white/70 shadow-sm"
                : "bg-transparent text-white/70 border-white/30 hover:bg-white/10"
            }`}
          >
            Hand AI
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/70">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            {isHandMode ? "Pinch to drag" : "Click and drag"}
          </span>
          {!assetsLoaded && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] tracking-[0.16em]">
              loading assets
            </span>
          )}
        </div>
      </div>

      <HandController enabled={isHandMode} onUpdate={handleHandUpdate} />

      {/* Minimal Centerpiece */}

      {/* The "Hand" Cursor */}
      <div
        ref={handRef}
        className="fixed top-0 left-0 w-[30px] pointer-events-none z-40 opacity-0"
      >
        <div className="relative">
            <img
            ref={dragRef}
            src="https://assets.codepen.io/16327/hand-drag.png"
            alt="Hand Drag"
            className="absolute top-[-22px] right-[1px] min-w-[141%] opacity-100"
            />
            <img
            ref={rockRef}
            src="https://assets.codepen.io/16327/hand-rock.png"
            alt="Hand Rock"
            className="absolute top-[-22px] right-[1px] min-w-[141%] opacity-0"
            />
            <img
            ref={handleRef}
            src="https://assets.codepen.io/16327/2D-circle.png"
            alt="Handle"
            className="absolute top-[-40px] left-0 right-0 w-full opacity-0"
            />
            <small
            ref={instructionsRef}
            className="absolute top-[20px] left-[-60%] w-[200%] text-center text-xs metallic-white"
            >
            drag me
            </small>
        </div>
      </div>

      {/* SVG Canvas for Line Drawing */}
      <svg
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-20"
      ></svg>

      {/* Interaction Proxy Layer */}
      <div
        ref={proxyRef}
        className="absolute top-0 left-0 w-full h-full z-30 touch-none"
      ></div>

      {/* Credits */}
      <div className="fixed bottom-4 left-4 z-50 pointer-events-none text-[11px] text-white/50">
        <span className="uppercase tracking-[0.16em]">Thanks to</span>{" "}
        <a
          href="https://gsap.com/"
          target="_blank"
          rel="noreferrer"
          className="underline pointer-events-auto hover:text-white/80"
        >
          GSAP
        </a>
      </div>
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none text-[11px] text-white/50">
        <span className="uppercase tracking-[0.16em]">by</span>{" "}
        <a
          href="https://bitcreate.studio"
          target="_blank"
          rel="noreferrer"
          className="underline pointer-events-auto hover:text-white/80"
        >
          Sambit Biswas
        </a>
      </div>
    </div>
  );
};
