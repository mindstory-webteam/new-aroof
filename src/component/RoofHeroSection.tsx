"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);



/* ── Content ─────────────────────────────────────────────────────────────── */

const GHOST_WORD = "ROOFING"; // the translucent word in the sky
const HEADLINE = ["A roof that", "outlasts every monsoon"]; // one entry per line
const TAGLINE =
  "UPVC roofing sheets that hold their colour and their shape, season after season.";
const IMAGE_ALT = "A modern house under a dark tiled roof";

/* ── Assets ──────────────────────────────────────────────────────────────── */

const HERO_VIDEO = "/video/main.mp4"; // from the site root: public/video/…
const HERO_VIDEO_POSTER = ""; // optional first-frame image
const HERO_IMAGE = "/images/home.png"; // transparent PNG, public/images/…

/* ── Palette ─────────────────────────────────────────────────────────────── */

const SKY = "#3b78b5"; // shows until the video can play, and if it never does
const NIGHT = "4, 9, 15"; // r, g, b of the fade at the foot of the section
const WHITE = "#ffffff";

/* ── Motion ──────────────────────────────────────────────────────────────── */

const REVEAL_START = "top 80%";
const RISE_FROM = 106; // headline push-up, yPercent
const RISE_EASE = "power4.out";

// Cursor reaction. Raise for a stronger effect, lower for subtler.
const HOUSE_DRIFT_X = 16; // px the house moves toward the cursor
const HOUSE_DRIFT_Y = 6;
const GHOST_DRIFT_X = 30; // px the ghost word moves the opposite way
const GHOST_DRIFT_Y = 10;
const DRIFT_DURATION = 1.1;

/* ── Layout ──────────────────────────────────────────────────────────────── */

const PAD_X = "clamp(24px, 5vw, 96px)";
const PAD_BOTTOM = "clamp(28px, 4vw, 64px)";

// House size, as a share of the section width. 100% = edge to edge.
// Smaller number = smaller house, larger number = cropped at both sides.
const HOUSE_WIDTH = "100%"; // desktop and tablet
const HOUSE_WIDTH_MOBILE = "140%"; // screens 900px wide and under

// How far the house sits above the bottom edge, as a share of the section
// height. 0% = resting on the bottom. Raise it to lift the house higher.
const HOUSE_LIFT = "3%";

// Where the ghost word sits from the top. Raise it to move the word lower.
const GHOST_TOP = "9%";
const GHOST_TOP_MOBILE = "12%";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function RoofHeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  /* Entrance. Scoped to the section so revert() can never touch anything else. */
  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const root = sectionRef.current;
      if (!root) return;

      // The markup already renders in its finished state, so reduced motion
      // just skips every tween.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const q = gsap.utils.selector(root);
      const lines = q(".roof-line");

      // Starting states are set before the trigger so nothing flashes in its
      // finished position first.
      gsap.set(lines, { yPercent: RISE_FROM, opacity: 0 });
      gsap.set(q(".roof-ghost"), { opacity: 0, y: 60 });
      gsap.set(q(".roof-house"), { opacity: 0, y: 90 });
      gsap.set(q(".roof-tag"), { opacity: 0, y: 18 });

      gsap
        .timeline({ scrollTrigger: { trigger: root, start: REVEAL_START, once: true } })
        .to(q(".roof-ghost"), { opacity: 1, y: 0, duration: 1.8, ease: "power3.out" }, 0.1)
        .to(q(".roof-house"), { opacity: 1, y: 0, duration: 1.6, ease: "power3.out" }, 0)
        .to(
          lines,
          { yPercent: 0, opacity: 1, duration: 1.15, ease: RISE_EASE, stagger: 0.12 },
          0.7
        )
        .to(q(".roof-tag"), { opacity: 1, y: 0, duration: 0.95, ease: "power3.out" }, 1.05);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  /* Background video. `muted` must be a property before play(), and play()
     rejects on autoplay policy, so it is caught. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onReady = () => {
      setVideoReady(true);
      if (!reduce) video.play().catch(() => {});
    };

    if (video.readyState >= 2) onReady();
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);

    // Some browsers only allow play() after the first interaction: one retry.
    const retry = () => {
      if (!reduce) video.play().catch(() => {});
    };
    window.addEventListener("pointerdown", retry, { once: true });

    return () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      window.removeEventListener("pointerdown", retry);
    };
  }, []);

  /* Cursor reaction: the house drifts toward the pointer and the ghost word
     drifts the other way. */
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const house = root.querySelector<HTMLElement>(".roof-house-drift");
    const ghost = root.querySelector<HTMLElement>(".roof-ghost-drift");
    if (!house || !ghost) return;

    const opts = { duration: DRIFT_DURATION, ease: "power3.out" };
    const hx = gsap.quickTo(house, "x", opts);
    const hy = gsap.quickTo(house, "y", opts);
    const gx = gsap.quickTo(ghost, "x", opts);
    const gy = gsap.quickTo(ghost, "y", opts);

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

    const apply = (nx: number, ny: number) => {
      hx(nx * HOUSE_DRIFT_X);
      hy(ny * HOUSE_DRIFT_Y);
      gx(-nx * GHOST_DRIFT_X);
      gy(-ny * GHOST_DRIFT_Y);
    };

    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      // Pointer is somewhere else on the page: settle back to rest.
      if (e.clientY < r.top || e.clientY > r.bottom) {
        apply(0, 0);
        return;
      }
      apply(
        clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1),
        clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1)
      );
    };
    const onLeave = () => apply(0, 0);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section ref={sectionRef} className="roof" aria-label="Roofing that lasts">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500&display=swap');

        .roof {
          --house-w: ${HOUSE_WIDTH};
          position: relative;
          box-sizing: border-box;
          width: 100%;
          height: 100vh;   /* fallback */
          height: 100svh;
          min-height: 620px;
          overflow: hidden;
          isolation: isolate;
          background: ${SKY};
          color: ${WHITE};
        }

        /* ---- 1. Sky video ---- */
        .roof-sky {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 900ms ease;
        }
        .roof-sky.is-ready { opacity: 1; }
        .roof-sky video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }

        /* ---- 2. Ghost word ----
           A gradient clipped to the letters: frosted at the top, almost gone
           at the bottom. The drift wrapper is separate from the word so the
           entrance tween and the cursor drift never fight over one transform. */
        .roof-ghost-drift {
          position: absolute;
          left: 0;
          right: 0;
          top: ${GHOST_TOP};
          z-index: 1;
          text-align: center;
          pointer-events: none;
          will-change: transform;
        }
        .roof-ghost {
          margin: 0;
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          font-weight: 400;
          font-size: clamp(5rem, 28vw, 36rem);
          line-height: 0.9;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          white-space: nowrap;
          user-select: none;
          color: transparent;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.62) 0%,
            rgba(255, 255, 255, 0.34) 55%,
            rgba(255, 255, 255, 0.08) 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 1px rgba(255, 255, 255, 0.28);
        }

        /* ---- 3. The house ----
           Sized by --house-w and centred with a negative margin, not a
           transform, so the cursor drift owns the only transform on it. */
        .roof-house-drift {
          position: absolute;
          bottom: ${HOUSE_LIFT};
          left: 50%;
          width: var(--house-w);
          margin-left: calc(var(--house-w) / -2);
          z-index: 2;
          pointer-events: none;
          will-change: transform;
        }
        .roof-house {
          display: block;
          width: 100%;
          height: auto;
          will-change: transform, opacity;
        }

        /* ---- 4. Fade into the ground ---- */
        .roof-fade {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          background: linear-gradient(
            to top,
            rgba(${NIGHT}, 0.95) 0%,
            rgba(${NIGHT}, 0.72) 15%,
            rgba(${NIGHT}, 0) 42%
          );
        }

        /* ---- 5. Copy ---- */
        .roof-copy {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 4;
          box-sizing: border-box;
          padding: 0 ${PAD_X} ${PAD_BOTTOM};
          display: flex;
          align-items: flex-end;
          gap: clamp(20px, 3.4vw, 64px);
        }

        .roof-tag {
          flex: 0 0 auto;
          max-width: 26ch;
          margin: 0 0 0.5em;
          font: 400 clamp(0.82rem, 1vw, 0.95rem)/1.6 'Inter', system-ui, sans-serif;
          color: rgba(255, 255, 255, 0.82);
          will-change: transform, opacity;
        }

        .roof-head {
          margin: 0;
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          font-weight: 400;
          font-size: clamp(2.3rem, 5.6vw, 5.4rem);
          line-height: 0.98;
          letter-spacing: 0.012em;
          text-transform: uppercase;
        }
        /* Each line sits in its own mask so it can push up out of it. */
        .roof-mask { display: block; overflow: hidden; padding-bottom: 0.06em; }
        .roof-line { display: block; will-change: transform, opacity; }

        .roof-missing {
          position: absolute;
          left: 50%;
          bottom: 30%;
          transform: translateX(-50%);
          z-index: 2;
          font: 0.8rem/1.4 'Inter', system-ui, sans-serif;
          color: rgba(255, 255, 255, 0.7);
        }

        /* ---- Small screens: the sky gets taller, so the house is sized up
           to stay the hero of the scene, and the copy stacks under the line. ---- */
        @media (max-width: 900px) {
          .roof { --house-w: ${HOUSE_WIDTH_MOBILE}; }
          .roof-ghost-drift { top: ${GHOST_TOP_MOBILE}; }
          .roof-copy { flex-direction: column-reverse; align-items: flex-start; gap: 14px; }
          .roof-tag { max-width: 34ch; margin: 0; }
          .roof-fade {
            background: linear-gradient(
              to top,
              rgba(${NIGHT}, 0.96) 0%,
              rgba(${NIGHT}, 0.75) 26%,
              rgba(${NIGHT}, 0) 58%
            );
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .roof-sky { transition: none; }
        }
      `}</style>

      {!videoFailed && (
        <div className={`roof-sky${videoReady ? " is-ready" : ""}`} aria-hidden="true">
          <video
            ref={videoRef}
            poster={HERO_VIDEO_POSTER || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onError={() => {
              setVideoFailed(true);
              if (process.env.NODE_ENV !== "production") {
                console.warn(
                  `[RoofHero] Sky video failed to load: ${HERO_VIDEO}. ` +
                    `It should sit at public${HERO_VIDEO}.`
                );
              }
            }}
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        </div>
      )}

      <div className="roof-ghost-drift" aria-hidden="true">
        <p className="roof-ghost">{GHOST_WORD}</p>
      </div>

      <div className="roof-house-drift">
        {imageFailed ? null : (
          <img
            className="roof-house"
            src={HERO_IMAGE}
            alt={IMAGE_ALT}
            onError={() => {
              setImageFailed(true);
              if (process.env.NODE_ENV !== "production") {
                console.warn(`[RoofHero] House image failed to load: ${HERO_IMAGE}.`);
              }
            }}
          />
        )}
      </div>
      {imageFailed && <span className="roof-missing">House image not found</span>}

      <div className="roof-fade" />

      <div className="roof-copy">
        <p className="roof-tag">{TAGLINE}</p>
        <h2 className="roof-head">
          {HEADLINE.map((line) => (
            <span className="roof-mask" key={line}>
              <span className="roof-line">{line}</span>
            </span>
          ))}
        </h2>
      </div>
    </section>
  );
}