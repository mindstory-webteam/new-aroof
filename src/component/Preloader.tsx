"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";


const ICON_PATH = "/logo/icon.png";

// Palette sampled from the actual hero frame — overcast, desaturated blue-grey
// easing into a warmer light grey-lavender near the bottom, not a clean sky.
const STORM_DARK = "#48536C"; // top, matches the darkest part of the video sky
const STORM_MID = "#6E7C99";
const STORM_LOW = "#8F9099";
const STORM_LIGHT = "#ACA9AE"; // bottom, the misty pale-grey haze low in the frame

// Brand blue — the exact colour of the icon square — reserved as an accent only.
const BRAND_BLUE = "#116AB1";

const INK = "#FFFFFF"; // wordmark colour — matches the live navbar logo, white on the video
const INK_MUTED = "rgba(255, 255, 255, 0.78)"; // tagline / secondary text

const WORDMARK = "a.roof";
const TAGLINE = "uPVC Roofing sheets";

const ICON_HOLD_MS = 900; // how long the big icon holds alone before shrinking
const REVEAL_DURATION_MS = 750; // must match the CSS transition durations below
const TAGLINE_DELAY_MS = 250; // gap after the wordmark lands before tagline fades in
const MIN_DURATION_MS = 2800; // brand beat always plays in full
const MAX_DURATION_MS = 8000; // hard ceiling if loading stalls
const EXIT_DURATION_MS = 1000;

type Stage = "grow" | "reveal" | "tagline";

type PreloaderProps = {
  onComplete?: () => void;
};

export default function Preloader({ onComplete }: PreloaderProps) {
  const [stage, setStage] = useState<Stage>("grow");
  const [progress, setProgress] = useState(0); // 0–1, real load progress
  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(false);

  const mountedAtRef = useRef(Date.now());
  const finishedRef = useRef(false);

  /* --------------------------------------------------------- stage timeline */
  useEffect(() => {
    const t1 = setTimeout(() => setStage("reveal"), ICON_HOLD_MS);
    const t2 = setTimeout(
      () => setStage("tagline"),
      ICON_HOLD_MS + REVEAL_DURATION_MS + TAGLINE_DELAY_MS
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  /* ------------------------------------------------- real load progress */
  useEffect(() => {
    // Count how many images/videos on the page have finished, so the bar
    // reflects something real rather than a scripted fake.
    const countAssets = () => {
      const media = Array.from(
        document.querySelectorAll("img, video")
      ) as (HTMLImageElement | HTMLVideoElement)[];
      if (media.length === 0) return 1;
      const ready = media.filter((el) =>
        el instanceof HTMLImageElement ? el.complete : el.readyState >= 3
      ).length;
      return ready / media.length;
    };

    const tick = setInterval(() => {
      setProgress((prev) => {
        const target = Math.max(countAssets(), prev);
        // Ease toward the target so the bar glides instead of jumping
        return prev + (target - prev) * 0.15;
      });
    }, 120);

    const onLoad = () => setProgress(1);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);

    return () => {
      clearInterval(tick);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  /* ------------------------------------------------------------- dismissal */
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setExiting(true);
    setTimeout(() => {
      setGone(true);
      onComplete?.();
    }, EXIT_DURATION_MS);
  }, [onComplete]);

  useEffect(() => {
    const elapsed = Date.now() - mountedAtRef.current;
    const ready = progress > 0.99 && stage === "tagline";

    if (ready) {
      const wait = Math.max(MIN_DURATION_MS - elapsed, 400);
      const t = setTimeout(finish, wait);
      return () => clearTimeout(t);
    }
  }, [progress, stage, finish]);

  // Hard ceiling — never trap the user behind a stuck loader
  useEffect(() => {
    const t = setTimeout(finish, MAX_DURATION_MS);
    return () => clearTimeout(t);
  }, [finish]);

  // Lock scrolling while the panel is up
  useEffect(() => {
    if (gone) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [gone]);

  if (gone) return null;

  const pct = Math.min(Math.round(progress * 100), 100);
  const settled = stage !== "grow";
  const taglineShown = stage === "tagline";

  return (
    <div className={`pl-root${exiting ? " exiting" : ""}`} role="status" aria-live="polite">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

        .pl-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: auto;
        }

        /* The whole visual — gradient, drifting mist, icon, wordmark, tagline,
           progress bar — lives inside this one panel. It exits by clipping to a
           shrinking circle centred on the icon, so the hero is revealed from
           the outer edges inward, closing in on the mark last. */
        .pl-panel {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: linear-gradient(
            180deg,
            ${STORM_DARK} 0%,
            ${STORM_MID} 34%,
            ${STORM_LOW} 66%,
            ${STORM_LIGHT} 100%
          );
          clip-path: circle(100vmax at 50% 46%);
          transition: clip-path ${EXIT_DURATION_MS}ms cubic-bezier(0.65, 0, 0.35, 1);
          will-change: clip-path;
        }
        .pl-root.exiting .pl-panel {
          clip-path: circle(0% at 50% 46%);
        }

        /* Soft, slow-drifting haze — pale, low-contrast, the way mist moves
           across the actual hero footage. Deliberately understated rather than
           bright, to match the overcast tone instead of a clean sky. */
        @keyframes plDriftA {
          0%   { transform: translate(-6%, -4%) scale(1); }
          50%  { transform: translate(4%, 5%) scale(1.12); }
          100% { transform: translate(-6%, -4%) scale(1); }
        }
        @keyframes plDriftB {
          0%   { transform: translate(5%, 3%) scale(1.08); }
          50%  { transform: translate(-4%, -6%) scale(1); }
          100% { transform: translate(5%, 3%) scale(1.08); }
        }

        .pl-cloud {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
          will-change: transform;
        }
        .pl-cloud.a {
          left: 6%;
          top: 4%;
          width: 60vmin;
          height: 60vmin;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, transparent 70%);
          animation: plDriftA 18s ease-in-out infinite;
        }
        .pl-cloud.b {
          right: 4%;
          bottom: 6%;
          width: 66vmin;
          height: 66vmin;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, transparent 70%);
          animation: plDriftB 21s ease-in-out infinite;
        }

        /* Faint brand-blue wash behind the icon — the one saturated colour
           allowed to bloom, since it's the actual brand colour, not scenery */
        .pl-glow {
          position: absolute;
          left: 50%;
          top: 46%;
          width: 60vmin;
          height: 60vmin;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, ${BRAND_BLUE}3D 0%, transparent 65%);
          pointer-events: none;
        }

        .pl-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 26px;
          transition: opacity 420ms ease, transform 420ms ease;
        }
        .pl-root.exiting .pl-content {
          opacity: 0;
          transform: scale(0.92);
        }

        /* ---------------------------------------------------------- icon row */
        .pl-row {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes plPopIn {
          0%   { opacity: 0; transform: scale(0.6) rotate(-6deg); }
          60%  { opacity: 1; transform: scale(1.05) rotate(1.5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes plGlow {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.92); }
          50%      { opacity: 0.8; transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes plFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }

        /* Big on mount, shrinks once .shrink is applied — the shrink, combined
           with the wordmark box expanding to its right, is what visually
           carries the icon a little to the left. No hard border/ring shape
           around it — just a soft brand-blue glow breathing behind it. */
        .pl-icon-wrap {
          position: relative;
          width: 168px;
          height: 168px;
          flex: none;
          transition: width ${REVEAL_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1),
            height ${REVEAL_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .pl-icon-wrap.shrink {
          width: 76px;
          height: 76px;
          animation: plFloat 3.6s ease-in-out 0.4s infinite;
        }

        .pl-icon-wrap.shrink::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: radial-gradient(circle, ${BRAND_BLUE}59 0%, transparent 68%);
          filter: blur(4px);
          transform: translate(-50%, -50%);
          animation: plGlow 3.6s ease-in-out infinite;
          z-index: -1;
        }

        .pl-icon {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 22%;
          object-fit: contain;
          animation: plPopIn 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
          box-shadow: 0 16px 36px rgba(8, 14, 26, 0.4);
        }

        /* -------------------------------------------------------- wordmark */
        /* Collapsed to zero width at first so the icon alone sits centred;
           expands + wipes open once .reveal is applied. White, same as the
           live navbar logo over the video. */
        .pl-wordmark-wrap {
          max-width: 0;
          margin-left: 0;
          overflow: hidden;
          opacity: 0;
          white-space: nowrap;
          transition: max-width ${REVEAL_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1),
            margin-left ${REVEAL_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 400ms ease 100ms;
        }
        .pl-wordmark-wrap.reveal {
          max-width: 460px;
          margin-left: 20px;
          opacity: 1;
        }

        .pl-wordmark {
          display: inline-block;
          font-family: 'Poppins', system-ui, sans-serif;
          font-weight: 700;
          font-size: clamp(2.4rem, 7.5vw, 3.8rem);
          line-height: 1;
          letter-spacing: -0.02em;
          color: ${INK};
          text-shadow: 0 2px 18px rgba(8, 14, 26, 0.35);
          /* Curtain wipe: fully clipped from the right at first, opens to 0 */
          clip-path: inset(0 100% 0 0);
          transition: clip-path ${REVEAL_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .pl-wordmark-wrap.reveal .pl-wordmark {
          clip-path: inset(0 0 0 0);
        }

        /* --------------------------------------------------------- tagline */
        .pl-tagline-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .pl-rule {
          height: 1px;
          width: 0;
          background: linear-gradient(90deg, transparent, ${BRAND_BLUE}, transparent);
          transition: width 700ms cubic-bezier(0.22, 1, 0.36, 1) 120ms;
        }
        .pl-rule.show { width: 190px; }

        .pl-tagline {
          font-family: 'Poppins', system-ui, sans-serif;
          font-weight: 600;
          font-size: clamp(0.72rem, 2.2vw, 0.92rem);
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: ${INK_MUTED};
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 600ms ease 220ms, transform 600ms ease 220ms;
          text-align: center;
        }
        .pl-tagline.show { opacity: 1; transform: translateY(0); }

        /* -------------------------------------------------------- progress */
        .pl-progress {
          position: absolute;
          bottom: 9vh;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .pl-track {
          width: 180px;
          height: 2px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.22);
          overflow: hidden;
        }
        .pl-bar {
          height: 100%;
          background: ${BRAND_BLUE};
          border-radius: 2px;
          transition: width 260ms ease;
        }
        .pl-pct {
          font-family: 'Poppins', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          color: ${INK_MUTED};
        }

        /* Respect users who don't want motion — show the brand, skip the theatre */
        @media (prefers-reduced-motion: reduce) {
          .pl-icon, .pl-icon-wrap, .pl-icon-wrap::before, .pl-cloud.a, .pl-cloud.b {
            animation: none !important;
          }
          .pl-icon-wrap, .pl-wordmark-wrap, .pl-wordmark {
            transition: none !important;
          }
        }
      `}</style>

      <div className="pl-panel">
        <div className="pl-cloud a" />
        <div className="pl-cloud b" />
        <div className="pl-glow" />

        <div className="pl-content">
          <div className="pl-row">
            <div className={`pl-icon-wrap${settled ? " shrink" : ""}`}>
              <img className="pl-icon" src={ICON_PATH} alt="" />
            </div>

            <div className={`pl-wordmark-wrap${settled ? " reveal" : ""}`}>
              <span className="pl-wordmark" aria-label={WORDMARK}>
                {WORDMARK}
              </span>
            </div>
          </div>

          <div className="pl-tagline-row">
            <div className={`pl-rule${taglineShown ? " show" : ""}`} />
            <div className={`pl-tagline${taglineShown ? " show" : ""}`}>{TAGLINE}</div>
          </div>
        </div>

        <div className="pl-progress">
          <div className="pl-track">
            <div className="pl-bar" style={{ width: `${pct}%` }} />
          </div>
          <div className="pl-pct">{pct}%</div>
        </div>
      </div>
    </div>
  );
}