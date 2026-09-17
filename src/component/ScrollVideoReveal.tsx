"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * ScrollVideoReveal
 * ------------------
 * Effect 1 (default / not scrolling): a normal looping <video> plays as the background.
 *   This video NEVER changes — it's always the same clip, always playing, regardless
 *   of anything clicked in the menu. It also shows a big three-word heading on the
 *   left that auto-rotates through HEADINGS on a timer, with a shifting color
 *   gradient and a blend mode so it visually merges into the footage.
 * Effect 2 (while scrolling): the video is replaced by a frame-by-frame image
 *   sequence whose current frame is driven directly by scroll position (the classic
 *   "scroll-scrub" effect used on Apple-style product pages). While scrubbing, a
 *   second three-word caption fades in on the left — a different one for each frame
 *   set (Rain / Summer), written about the roof sheet itself rather than the weather
 *   shown in Effect 1.
 * Right-side menu: a vertical thumbnail carousel that picks WHICH frame sequence
 *   Effect 2 scrubs through (and which caption goes with it). Clicking a thumbnail
 *   does not touch the video at all — it only changes what you'll scroll through.
 *   Thumbnails are square (rounded-corner) tiles.
 * Watermark: a small logo image is pinned in a corner of the section, always
 *   visible above both Effect 1 and Effect 2, at low opacity so it reads as a
 *   watermark rather than a competing logo.
 * A short opacity crossfade blends Effect 1 and Effect 2 so the switch doesn't feel abrupt.
 *
 * SETUP
 * -----
 * 1. Put the background video at `public/video/video-1.mp4` (or update VIDEO_PATH).
 *    It plays exactly the same no matter what's selected in the menu.
 * 2. Each entry in FRAME_SETS is one frame-by-frame sequence:
 *      - "Rain"   -> public/frames-rain/frame_001.jpg   … frame_120.jpg  (your monsoon clip)
 *      - "Summer" -> public/frames-summer/frame_001.jpg … frame_120.jpg (your aerial roof clip)
 *    Both are already extracted for you — see frames-rain.zip and frames-summer.zip.
 *    To add another option later, extract a video the same way, e.g.:
 *      ffmpeg -i another-video.mp4 -vf "fps=12,scale=800:-1" -q:v 4 frame_%03d.jpg
 *    then add a new FRAME_SETS entry pointing at that folder, with its own `caption`.
 * 3. Put your logo at `public/logo/watermark.png` (or update WATERMARK_PATH). Use a
 *    transparent-background PNG or SVG for best results.
 * 4. Drop <ScrollVideoReveal /> anywhere in a page. It reserves its own scroll
 *    length (SCRUB_HEIGHT_VH) and pins itself full-screen while the user scrolls
 *    through that section, then releases scroll normally afterwards.
 * 5. The heading font ("Anton") is pulled in via an @import in the embedded <style>
 *    tag below — for production, move that @import into your global stylesheet or
 *    next/font instead so it isn't re-fetched on every mount.
 */

const VIDEO_PATH = "/video/video-1.mp4"; // background video for Effect 1 — always the same

// Watermark logo shown in a fixed corner of the section, on top of both effects.
const WATERMARK_PATH = "/logo/watermark.png";
const WATERMARK_POSITION: "top-left" | "top-right" | "bottom-left" | "bottom-right" =
  "bottom-right";
const WATERMARK_WIDTH_PX = 96;
const WATERMARK_OPACITY = 0.55;

// How many viewport-heights of scrolling it takes to play through all frames.
// Bigger = slower / more deliberate scrub. Smaller = snappier.
const SCRUB_HEIGHT_VH = 400;

// Fraction (0–1) of the scroll section used for the crossfade handoff at the top.
const FADE_ZONE = 0.06;

// As the user finishes scrubbing through the frames, a sky-fog layer builds up
// and fully whites out the screen just before the section releases its pin —
// so instead of cutting straight from the last frame to whatever comes next,
// it feels like scrolling up through cloud into the next section. FOG_START is
// the fraction (0–1) of the section's scroll progress where the fog begins
// appearing; by progress 1 it's fully opaque. Tune FOG_COLOR to match whatever
// section follows so the hand-off is seamless rather than a hard cut.
const FOG_START = 0.85;
const FOG_COLOR = "#EEF1F4";

// Headings shown over the video (Effect 1), rotating automatically. Always three
// words. Unrelated to the menu below — these always play no matter which frame
// set is selected.
const HEADINGS = ["Weatherproof Every Roof", "Built For Storms", "Trusted Family Shelter"];
const HEADING_INTERVAL_MS = 3500; // how long each heading stays before swapping
const HEADING_FADE_MS = 700; // crossfade duration between headings

// Each entry is one frame-by-frame sequence the right-side menu can switch Effect 2
// to, plus a set of three-word captions (about the roof sheet itself) that change
// as the user scrolls further through that sequence — not just one static line.
type FrameSet = {
  label: string;
  folder: string;
  frameCount: number;
  captions: string[]; // each entry exactly three words; shown in order as you scroll
};

const FRAME_SETS: FrameSet[] = [
  {
    label: "Rain",
    folder: "/frames-rain",
    frameCount: 120,
    captions: ["Handles Heavy Rain", "Seals Every Joint", "Built To Last"],
  },
  {
    label: "Summer",
    folder: "/frames-summer",
    frameCount: 120,
    captions: ["Reflects Summer Heat", "Keeps Homes Cool", "Built To Last"],
  },
];

const framePath = (set: FrameSet, i: number) =>
  `${set.folder}/frame_${String(i).padStart(3, "0")}.jpg`;

const watermarkPositionStyle: React.CSSProperties = (() => {
  const offset = "4vw";
  switch (WATERMARK_POSITION) {
    case "top-left":
      return { top: offset, left: offset };
    case "top-right":
      return { top: offset, right: offset };
    case "bottom-left":
      return { bottom: offset, left: offset };
    case "bottom-right":
    default:
      return { bottom: offset, right: offset };
  }
})();

export default function ScrollVideoReveal() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // One preloaded image array per frame set, indexed the same as FRAME_SETS
  const imagesCacheRef = useRef<HTMLImageElement[][]>([]);
  const currentFrameRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [scrubOpacity, setScrubOpacity] = useState(0); // 0 = show video, 1 = show scrub frames
  const [scrollProgress, setScrollProgress] = useState(0); // 0–1 raw progress through the section, used to stage captions
  const [fogOpacity, setFogOpacity] = useState(0); // 0 = clear, 1 = fully whited out by sky fog
  const [headingIndex, setHeadingIndex] = useState(0);
  const [activeSetIndex, setActiveSetIndex] = useState(0); // which FRAME_SETS entry Effect 2 uses

  const activeCaptions = FRAME_SETS[activeSetIndex].captions;
  const captionIndex = Math.min(
    activeCaptions.length - 1,
    Math.floor(scrollProgress * activeCaptions.length)
  );

  const activeSetIndexRef = useRef(activeSetIndex);
  useEffect(() => {
    activeSetIndexRef.current = activeSetIndex;
  }, [activeSetIndex]);

  // Draw a given frame index from a given set onto the canvas ("cover" fit)
  const drawFrame = useCallback((setIndex: number, frameIndex: number) => {
    const canvas = canvasRef.current;
    const img = imagesCacheRef.current[setIndex]?.[frameIndex];
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

    if (imgRatio > canvasRatio) {
      drawHeight = canvas.height;
      drawWidth = drawHeight * imgRatio;
      offsetX = (canvas.width - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = canvas.width;
      drawHeight = drawWidth / imgRatio;
      offsetX = 0;
      offsetY = (canvas.height - drawHeight) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }, []);

  // Preload every frame of every set up front so scrubbing (and menu switching)
  // never shows a blank/half-loaded image
  useEffect(() => {
    let cancelled = false;
    const totalFrames = FRAME_SETS.reduce((sum, s) => sum + s.frameCount, 0);
    let loaded = 0;

    FRAME_SETS.forEach((set, setIndex) => {
      const imgs: HTMLImageElement[] = [];
      for (let i = 1; i <= set.frameCount; i++) {
        const img = new Image();
        img.src = framePath(set, i);
        img.onload = img.onerror = () => {
          loaded += 1;
          if (!cancelled) {
            setLoadProgress(loaded / totalFrames);
            if (loaded === totalFrames) setImagesLoaded(true);
          }
        };
        imgs.push(img);
      }
      imagesCacheRef.current[setIndex] = imgs;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-rotate the heading over the video on a fixed timer (independent of the menu)
  useEffect(() => {
    if (HEADINGS.length <= 1) return;
    const id = setInterval(() => {
      setHeadingIndex((i) => (i + 1) % HEADINGS.length);
    }, HEADING_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Keep the canvas's internal pixel size matched to the viewport / DPR
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      drawFrame(activeSetIndexRef.current, currentFrameRef.current);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [drawFrame]);

  // Scroll listener: maps scroll progress through the section -> frame index + crossfade.
  // Always reads the CURRENTLY selected frame set via activeSetIndexRef, so switching
  // sets from the menu takes effect on the very next scroll tick.
  useEffect(() => {
    if (!imagesLoaded) return;

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;

        const section = sectionRef.current;
        if (!section) return;

        const rect = section.getBoundingClientRect();
        const total = section.offsetHeight - window.innerHeight;
        const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;

        // Crossfade: video visible at progress 0, fully faded to frames by FADE_ZONE
        const fade = Math.min(progress / FADE_ZONE, 1);
        setScrubOpacity(fade);
        setScrollProgress(progress);

        // Sky fog builds up over the final stretch of the scrub, reaching full
        // opacity exactly as the section finishes and unpins.
        const fog = Math.max(0, (progress - FOG_START) / (1 - FOG_START));
        setFogOpacity(Math.min(fog, 1));

        // Pause the looping video once it's fully hidden (saves CPU/battery),
        // resume it once it's back in view. The video itself never otherwise changes.
        const video = videoRef.current;
        if (video) {
          if (fade >= 1 && !video.paused) video.pause();
          else if (fade < 1 && video.paused) video.play().catch(() => {});
        }

        const setIndex = activeSetIndexRef.current;
        const frameCount = FRAME_SETS[setIndex].frameCount;
        const frameIndex = Math.round(progress * (frameCount - 1));
        currentFrameRef.current = frameIndex;
        drawFrame(setIndex, frameIndex);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // set initial state

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [imagesLoaded, drawFrame]);

  // Redraw immediately when the menu selection changes, using whatever scroll
  // progress is currently in effect, so the canvas doesn't show a stale frame
  // from the previous set while waiting for the next scroll event.
  useEffect(() => {
    drawFrame(activeSetIndex, currentFrameRef.current);
  }, [activeSetIndex, drawFrame]);

  return (
    <div ref={sectionRef} style={{ position: "relative", height: `${SCRUB_HEIGHT_VH}vh` }}>
      {/* Font import + heading color-shift / blend / menu styling */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');

        @keyframes headingHueShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .svr-heading {
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          background: linear-gradient(
            90deg,
            #ffffff,
            #bfe6ff,
            #6ec6ff,
            #e8f7ff,
            #ffffff
          );
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: headingHueShift 6s ease-in-out infinite;
          mix-blend-mode: screen;
        }

        .svr-menu-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          pointer-events: auto;
        }

        /* Square (rounded-corner) thumbnail tiles */
        .svr-menu-thumb {
          width: 52px;
          height: 52px;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.45);
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          box-shadow: 0 2px 10px rgba(0, 30, 60, 0.25);
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .svr-menu-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .svr-menu-item.active .svr-menu-thumb {
          transform: scale(1.14);
          border-color: #bfe6ff;
          box-shadow: 0 0 0 4px rgba(191, 230, 255, 0.35), 0 4px 16px rgba(0, 40, 80, 0.35);
        }

        .svr-menu-label {
          font-family: system-ui, sans-serif;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.75);
          transition: color 0.25s ease;
        }

        .svr-menu-item.active .svr-menu-label {
          color: #ffffff;
          font-weight: 600;
        }

        .svr-watermark {
          position: absolute;
          width: ${WATERMARK_WIDTH_PX}px;
          opacity: ${WATERMARK_OPACITY};
          pointer-events: none;
          user-select: none;
          z-index: 10;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
        }

        .svr-watermark img {
          width: 100%;
          height: auto;
          display: block;
        }

        /* Sky-fog transition — fades in over the last stretch of scrubbing and
           whites the screen out, so the hand-off into the next section feels
           like scrolling up through cloud rather than a hard cut. */
        @keyframes svrFogDriftA {
          0%   { transform: translate(-4%, 2%) scale(1); }
          50%  { transform: translate(5%, -3%) scale(1.15); }
          100% { transform: translate(-4%, 2%) scale(1); }
        }
        @keyframes svrFogDriftB {
          0%   { transform: translate(4%, -2%) scale(1.1); }
          50%  { transform: translate(-5%, 3%) scale(1); }
          100% { transform: translate(4%, -2%) scale(1.1); }
        }
        @keyframes svrFogDriftC {
          0%   { transform: translate(0%, 4%) scale(1.05); }
          50%  { transform: translate(3%, -4%) scale(1.2); }
          100% { transform: translate(0%, 4%) scale(1.05); }
        }

        .svr-fog-cloud {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
          will-change: transform;
        }
        .svr-fog-cloud.a {
          left: -10%;
          top: 10%;
          width: 70vmin;
          height: 70vmin;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, transparent 70%);
          animation: svrFogDriftA 14s ease-in-out infinite;
        }
        .svr-fog-cloud.b {
          right: -8%;
          bottom: 4%;
          width: 80vmin;
          height: 80vmin;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.85) 0%, transparent 70%);
          animation: svrFogDriftB 17s ease-in-out infinite;
        }
        .svr-fog-cloud.c {
          left: 30%;
          top: -10%;
          width: 60vmin;
          height: 60vmin;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
          animation: svrFogDriftC 20s ease-in-out infinite;
        }
      `}</style>

      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: "#000" }}>
        {/* Layer 1: normal looping background video + rotating heading (Effect 1) — untouched by the menu */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 1 - scrubOpacity,
            transition: "opacity 0.15s linear",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          >
            <source src={VIDEO_PATH} type="video/mp4" />
          </video>

          {/* Big auto-rotating three-word heading, pinned to the left side */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
              padding: "0 5vw",
            }}
          >
            <div style={{ position: "relative", maxWidth: "60%", height: "auto" }}>
              {HEADINGS.map((heading, i) => (
                <h1
                  key={heading}
                  aria-hidden={i !== headingIndex}
                  className="svr-heading"
                  style={{
                    position: i === 0 ? "relative" : "absolute",
                    top: 0,
                    left: 0,
                    margin: 0,
                    fontSize: "clamp(3.5rem, 8.5vw, 8rem)",
                    fontWeight: 400,
                    lineHeight: 1.05,
                    letterSpacing: "0.01em",
                    opacity: i === headingIndex ? 1 : 0,
                    transform: i === headingIndex ? "translateY(0)" : "translateY(12px)",
                    transition: `opacity ${HEADING_FADE_MS}ms ease, transform ${HEADING_FADE_MS}ms ease`,
                  }}
                >
                  {heading}
                </h1>
              ))}
            </div>
          </div>

          {/* Right-side thumbnail menu — picks which frame set Effect 2 will scrub
              through on scroll (and which caption goes with it). Does NOT touch
              the video above in any way. Tiles are square. */}
          <div
            style={{
              position: "absolute",
              right: "4vw",
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              zIndex: 5,
            }}
          >
            {FRAME_SETS.map((set, i) => (
              <button
                key={set.label}
                type="button"
                aria-label={`Use ${set.label} frames when scrolling`}
                aria-pressed={activeSetIndex === i}
                onClick={() => setActiveSetIndex(i)}
                className={`svr-menu-item${activeSetIndex === i ? " active" : ""}`}
              >
                <span className="svr-menu-thumb">
                  <img src={framePath(set, 1)} alt="" />
                </span>
                <span className="svr-menu-label">{set.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Layer 2: scroll-scrubbed frame-by-frame canvas (Effect 2) — uses whichever
            frame set is currently selected in the menu above, plus a matching
            three-word caption about the roof sheet itself */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: scrubOpacity,
            transition: "opacity 0.15s linear",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          />

          {/* Caption tied to whichever frame set is active, staged in three steps
              that change as you scroll further — different wording for Rain vs
              Summer, crossfades between stages and if you switch sets mid-scroll */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
              padding: "0 5vw",
            }}
          >
            <div style={{ position: "relative", maxWidth: "60%", height: "auto" }}>
              {activeCaptions.map((caption, i) => (
                <h2
                  key={`${activeSetIndex}-${i}`}
                  aria-hidden={i !== captionIndex}
                  className="svr-heading"
                  style={{
                    position: i === 0 ? "relative" : "absolute",
                    top: 0,
                    left: 0,
                    margin: 0,
                    fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
                    fontWeight: 400,
                    lineHeight: 1.05,
                    letterSpacing: "0.01em",
                    opacity: i === captionIndex ? 1 : 0,
                    transform: i === captionIndex ? "translateY(0)" : "translateY(12px)",
                    transition: "opacity 0.5s ease, transform 0.5s ease",
                  }}
                >
                  {caption}
                </h2>
              ))}
            </div>
          </div>
        </div>

        {/* Sky-fog transition — builds up as the scrub finishes and whites out
            the screen right as the section unpins, so scrolling into whatever
            section follows feels like passing up through cloud rather than a
            hard cut from the last frame. Sits above both effects and the menu,
            but below the watermark so the mark is the last thing still visible. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 8,
            pointerEvents: "none",
            opacity: fogOpacity,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, transparent 0%, ${FOG_COLOR}CC 55%, ${FOG_COLOR} 100%)`,
            }}
          />
          <div className="svr-fog-cloud a" />
          <div className="svr-fog-cloud b" />
          <div className="svr-fog-cloud c" />
        </div>

        {/* Logo watermark — sits above both Effect 1 and Effect 2, always visible */}
        <div className="svr-watermark" style={watermarkPositionStyle}>
          <img src={WATERMARK_PATH} alt="" />
        </div>

        {/* Simple loading indicator while frames preload */}
        {!imagesLoaded && (
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              color: "#fff",
              font: "12px sans-serif",
              opacity: 0.8,
            }}
          >
            Loading frames… {Math.round(loadProgress * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}