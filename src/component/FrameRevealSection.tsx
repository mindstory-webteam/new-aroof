"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * FrameRevealSection
 * -------------------
 * A pinned, scroll-scrubbed frame sequence: as the user scrolls through this
 * section, the scrollbar position picks which frame of a pre-rendered image
 * sequence is drawn to a <canvas>, scaled to fit fully inside the viewport
 * (never cropped at the sides). Three headings — top-left, top-right, and
 * bottom-right — change in step with the frames, in four stages, to narrate
 * what's on screen.
 *
 * This is the same "scrub a rendered sequence with the scrollbar" technique
 * Apple product pages use for video — done with still frames on a canvas
 * instead of a <video>, because scrubbing an actual <video>'s currentTime
 * frame-accurately against scroll is unreliable across browsers. A canvas
 * frame sequence gives instant, exact seeking.
 *
 * SETUP
 * -----
 * 1. Unzip `roof-frames.zip` into `public/roof-frames/` so the files sit at
 *    `public/roof-frames/frame_001.jpg` ... `frame_120.jpg`.
 * 2. Render <FrameRevealSection /> wherever this beat belongs in the page
 *    (e.g. straight after <AboutSection />).
 * 3. FRAME_COUNT / FRAME_PATH below must match how many frames you exported
 *    and where they live. If you re-export the sequence at a different frame
 *    count, update FRAME_COUNT to match.
 * 4. SECTION_HEIGHT_VH controls how much scroll distance it takes to play
 *    through the whole sequence — taller means slower, more deliberate
 *    scrubbing per frame.
 */

const FRAME_COUNT = 120;
const FRAME_PATH = (i: number) =>
  `/roof-frames/frame_${String(i).padStart(3, "0")}.jpg`;

const SECTION_HEIGHT_VH = 400;

// Background the canvas sits on — matches the flat white the frames were
// rendered against, so there's no seam around the letterboxed image.
const STAGE_BACKGROUND = "#F5F6F7";

const MARKERS = false;

// Extra shrink applied on top of "contain" fit, so the sheet doesn't touch
// the very edges of the viewport. 1 = fills as much as contain allows;
// lower values (e.g. 0.85) leave more visible margin on all sides.
const FRAME_SCALE = 0.9;

type Stage = {
  // 0–1 range of overall scroll progress this stage owns.
  from: number;
  to: number;
  left: string;
  right: string;
  bottomRight: string;
};

const STAGES: Stage[] = [
  {
    from: 0,
    to: 0.25,
    left: "Engineered Profile",
    right:
      "Cold-rolled steel coil, roll-formed into a precise trapezoidal wave for strength without weight.",
    bottomRight: "0.47mm gauge",
  },
  {
    from: 0.25,
    to: 0.5,
    left: "Built to Interlock",
    right:
      "Ribbed edges overlap sheet to sheet, closing every seam against wind-driven rain.",
    bottomRight: "Zero-gap seams",
  },
  {
    from: 0.5,
    to: 0.75,
    left: "Every Layer Matters",
    right:
      "Coated steel, an insulating core, and a sealed second skin — not just a single sheet of metal.",
    bottomRight: "3-layer sandwich",
  },
  {
    from: 0.75,
    to: 1,
    left: "Dimensioned & Verified",
    right:
      "Profile height, pitch and coverage width are checked against spec before a coil ever leaves the line.",
    bottomRight: "12-year warranty",
  },
];

// Wraps each word in an overflow-hidden mask with an inner span that GSAP
// slides up from below — a "curtain" reveal per word, rather than the whole
// line just fading in at once.
function renderRevealWords(text: string, keyPrefix: string) {
  const words = text.split(" ");
  return words.map((word, i) => (
    <span className="reveal-mask" key={`${keyPrefix}-${i}`}>
      <span className="reveal-word">
        {word}
        {i < words.length - 1 ? "\u00A0" : ""}
      </span>
    </span>
  ));
}

export default function FrameRevealSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const leftTitleRef = useRef<HTMLHeadingElement>(null);
  const rightCopyRef = useRef<HTMLParagraphElement>(null);
  const bottomRightRef = useRef<HTMLHeadingElement>(null);

  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const drawnFrameRef = useRef(-1);

  const [loaded, setLoaded] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  // Preload every frame before wiring up scroll, so the very first scrub
  // doesn't stall on a network request.
  useEffect(() => {
    let cancelled = false;
    let loadedCount = 0;
    const images: HTMLImageElement[] = new Array(FRAME_COUNT);

    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i);
      img.onload = img.onerror = () => {
        if (cancelled) return;
        loadedCount += 1;
        setLoadPct(Math.round((loadedCount / FRAME_COUNT) * 100));
        if (loadedCount === FRAME_COUNT) setLoaded(true);
      };
      images[i - 1] = img;
    }
    imagesRef.current = images;

    return () => {
      cancelled = true;
    };
  }, []);

  // Draw whichever frame currentFrameRef points at, letterboxed into the
  // canvas ("contain" behaviour) so the sheet never distorts or crops.
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;
    if (drawnFrameRef.current === index) return;
    drawnFrameRef.current = index;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // "contain" behaviour: scale to the smaller ratio so the whole frame is
    // always visible, never cropped at the sides. FRAME_SCALE shrinks it a
    // touch further so there's breathing room around the edges.
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight) * FRAME_SCALE;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const dx = (cw - drawW) / 2;
    const dy = (ch - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  };

  useEffect(() => {
    if (!loaded) return;

    drawFrame(0);

    // gsap.context scopes every tween/trigger created inside it to this
    // component, so ctx.revert() on unmount cleans up exactly what this file
    // made. Nothing is returned from inside the callback — gsap.context
    // doesn't use a return value the way a useEffect cleanup does.
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: pinRef.current,
        pinSpacing: false,
        anticipatePin: 1,
        scrub: true,
        markers: MARKERS,
        onUpdate: (self) => {
          const progress = self.progress;

          const frame = Math.min(
            FRAME_COUNT - 1,
            Math.round(progress * (FRAME_COUNT - 1))
          );
          currentFrameRef.current = frame;
          drawFrame(frame);

          if (progressBarRef.current) {
            progressBarRef.current.style.transform = `scaleY(${progress})`;
          }

          const idx = STAGES.findIndex(
            (s) => progress >= s.from && progress < s.to
          );
          const resolvedIdx = idx === -1 ? STAGES.length - 1 : idx;
          setStageIndex((prev) => (prev === resolvedIdx ? prev : resolvedIdx));
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [loaded]);

  // Redraw the current frame on resize, kept as its own plain effect rather
  // than nested inside the gsap.context callback above.
  useEffect(() => {
    if (!loaded) return;
    const onResize = () => drawFrame(currentFrameRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Every time the stage changes, curtain-reveal the words in the three
  // headings. useLayoutEffect (not useEffect) runs synchronously right after
  // the DOM updates but before the browser paints, so the hide-then-animate
  // sequence below never flashes visible text first. Everything here is
  // wrapped defensively: since the CSS default is already visible text,
  // any failure here just means "no fancy animation", never "invisible text".
  useLayoutEffect(() => {
    if (!loaded) return;

    // The three refs are typed as HTMLHeadingElement | HTMLParagraphElement | null,
    // which are sibling types (neither a subtype of the other). A type predicate
    // can only narrow a parameter to a MORE specific type than it's declared as,
    // so predicating straight down to `HTMLElement` (a supertype of both) is
    // rejected by the compiler. Casting the array to `(HTMLElement | null)[]`
    // first gives the predicate a parameter type it's actually allowed to narrow.
    const containers = (
      [leftTitleRef.current, rightCopyRef.current, bottomRightRef.current] as (
        | HTMLElement
        | null
      )[]
    ).filter((el): el is HTMLElement => el !== null);

    const words = containers.flatMap((el) =>
      Array.from(el.querySelectorAll<HTMLElement>(".reveal-word"))
    );
    if (words.length === 0) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let tween: gsap.core.Tween | undefined;
    try {
      if (reduceMotion) {
        gsap.set(words, { clearProps: "transform" });
      } else {
        tween = gsap.fromTo(
          words,
          { yPercent: 100 },
          {
            yPercent: 0,
            duration: 0.85,
            ease: "power3.out",
            stagger: 0.035,
          }
        );
      }
    } catch (err) {
      // Animation failed for some reason — make sure the words are left in
      // their normal, visible position rather than stuck mid-transform.
      gsap.set(words, { clearProps: "transform" });
      console.error("FrameRevealSection: word reveal animation failed", err);
    }

    return () => {
      tween?.kill();
    };
  }, [stageIndex, loaded]);

  const stage = STAGES[stageIndex];

  return (
    <section
      ref={sectionRef}
      aria-label="How the roof sheet is made"
      style={{ position: "relative", height: `${SECTION_HEIGHT_VH}vh` }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');

        .frs-stage {
          height: 100vh;
          position: relative;
          overflow: hidden;
          background: ${STAGE_BACKGROUND};
        }

        .frs-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }

        .frs-loading {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          background: ${STAGE_BACKGROUND};
          font-family: 'Inter', system-ui, sans-serif;
          color: rgba(16, 32, 44, 0.55);
          font-size: 0.85rem;
          letter-spacing: 0.04em;
        }
        .frs-loading-track {
          width: 160px;
          height: 2px;
          background: rgba(16, 32, 44, 0.14);
          border-radius: 2px;
          overflow: hidden;
        }
        .frs-loading-fill {
          height: 100%;
          background: #17536f;
          transition: width 0.15s ease;
        }

        .frs-heading-row {
          position: absolute;
          top: clamp(20px, 4vh, 48px);
          left: 0;
          right: 0;
          z-index: 5;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: clamp(20px, 5vw, 80px);
          padding: 0 clamp(20px, 5vw, 64px);
          pointer-events: none;
        }

        .frs-left,
        .frs-right {
          flex: 1 1 0;
          min-width: 0;
        }
        .frs-right { text-align: right; }

        .frs-left-title {
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          font-weight: 400;
          font-size: clamp(2.6rem, 6vw, 5.5rem);
          line-height: 0.98;
          letter-spacing: 0.01em;
          color: #10405a;
          margin: 0;
        }

        .frs-right-copy {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: clamp(0.92rem, 1.15vw, 1.1rem);
          line-height: 1.5;
          color: rgba(16, 32, 44, 0.72);
          margin: 0 0 0 auto;
          max-width: 34ch;
        }

        /* Word-mask reveal: each word sits in an overflow-hidden box; GSAP
           (in a layout effect, see the component) hides the inner span and
           slides it up into view. The CSS default here is visible/untransformed
           on purpose — if the JS animation ever fails to run for any reason,
           the text still shows normally instead of staying invisible. */
        .reveal-mask {
          display: inline-block;
          overflow: hidden;
          vertical-align: top;
        }
        .reveal-word {
          display: inline-block;
          will-change: transform;
        }

        .frs-progress-track {
          position: absolute;
          left: clamp(16px, 3vw, 32px);
          top: clamp(80px, 14vh, 140px);
          bottom: clamp(80px, 14vh, 140px);
          width: 2px;
          background: rgba(16, 32, 44, 0.14);
          border-radius: 2px;
          overflow: hidden;
          z-index: 5;
        }
        .frs-progress-fill {
          width: 100%;
          height: 100%;
          background: #17536f;
          transform-origin: top center;
          transform: scaleY(0);
        }

        .frs-counter {
          position: absolute;
          left: clamp(20px, 5vw, 64px);
          bottom: clamp(34px, 6vh, 56px);
          z-index: 5;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.78rem;
          letter-spacing: 0.06em;
          color: rgba(16, 32, 44, 0.5);
        }

        .frs-bottom-right {
          position: absolute;
          right: clamp(20px, 5vw, 64px);
          bottom: clamp(34px, 6vh, 56px);
          z-index: 5;
          text-align: right;
          pointer-events: none;
        }

        .frs-bottom-right-title {
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          font-weight: 400;
          font-size: clamp(1.1rem, 1.8vw, 1.6rem);
          line-height: 1;
          letter-spacing: 0.01em;
          color: #17536f;
          margin: 0;
        }

        @media (max-width: 760px) {
          .frs-heading-row {
            flex-direction: column;
            gap: 14px;
          }
          .frs-right { text-align: left; }
          .frs-right-copy { margin: 0; max-width: 46ch; }
          .frs-bottom-right { right: 20px; bottom: 20px; }
        }
      `}</style>

      <div ref={pinRef} className="frs-stage">
        {!loaded && (
          <div className="frs-loading">
            <span>Loading sequence — {loadPct}%</span>
            <div className="frs-loading-track">
              <div className="frs-loading-fill" style={{ width: `${loadPct}%` }} />
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="frs-canvas" />

        {loaded && (
          <>
            <div className="frs-heading-row">
              <div className="frs-left">
                <h2 className="frs-left-title" ref={leftTitleRef} key={`l-${stageIndex}`}>
                  {renderRevealWords(stage.left, `l-${stageIndex}`)}
                </h2>
              </div>
              <div className="frs-right">
                <p className="frs-right-copy" ref={rightCopyRef} key={`r-${stageIndex}`}>
                  {renderRevealWords(stage.right, `r-${stageIndex}`)}
                </p>
              </div>
            </div>

            <div className="frs-counter">
              {String(stageIndex + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
            </div>

            <div className="frs-bottom-right">
              <h3
                className="frs-bottom-right-title"
                ref={bottomRightRef}
                key={`br-${stageIndex}`}
              >
                {renderRevealWords(stage.bottomRight, `br-${stageIndex}`)}
              </h3>
            </div>

            <div className="frs-progress-track">
              <div ref={progressBarRef} className="frs-progress-fill" />
            </div>
          </>
        )}
      </div>
    </section>
  );
}