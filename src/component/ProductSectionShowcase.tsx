"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);


const PRODUCTS = [
  {
    id: "tile",
    display: ["Tile UPVC", "Sheet"],
    note: "Classic tile profile, built to hold its colour through four decades of sun and monsoon.",
    features: [
      "Roman tile profile that reads as clay from the street",
      "2.5 mm total build across three co-extruded layers",
      "Walkable at the purlin without crazing or creep",
    ],
    hotspots: [
      { label: "ASA coated surface", x: 74, y: 16 },
      { label: "Interlocking side lap", x: 22, y: 82 },
    ],
    colors: [
      { id: "terracotta", label: "Brick", hex: "#633321", src: "/images/sheet-colors/title/red.png" },
    
      { id: "slate", label: "Graphite", hex: "#4c5255", src: "/images/sheet-colors/title/sliver.png" },
    ],
  },
  {
    id: "trafford",
    display: ["Trafford", "UPVC Sheet"],
    note: "Deep trapezoidal ribs for long spans, warehouses and coastal sheds.",
    features: [
      "Trapezoidal ribs carrying wider purlin spacing",
      "2.0 mm build with an anti-corrosive underside",
      "Holds up where salt air strips coated steel",
    ],
    hotspots: [
      { label: "Deep rib geometry", x: 70, y: 18 },
      { label: "Anti-corrosive base", x: 25, y: 84 },
    ],
    colors: [
      { id: "brick", label: "Brick", hex: "#633321", src: "/images/sheet-colors/upvc/red.png" },
      { id: "graphite", label: "Graphite", hex: "#4c5255", src: "/images/sheet-colors/upvc/sliver.png" },
      { id: "olive", label: "White", hex: "#ffff", src: "/images/sheet-colors/upvc/white.png" },
      
    ],
  },
];

/* ── Palette ─────────────────────────────────────────────────────────────── */

const BG = "#FFFFFF";
const INK = "#16242e";
const MUTED = "rgba(22, 36, 46, 0.58)";
const LINE = "rgba(22, 36, 46, 0.14)";
const ACCENT = "#17536f";
const PLATE = "#f2f5f6"; // sits under the video, and stands in if it fails

/* ── Stage video ─────────────────────────────────────────────────────────── */

// Paths are from the site root: this file lives at public/video/…
const STAGE_VIDEO = "/video/video-1.mp4";
const STAGE_VIDEO_WEBM = ""; // optional, listed first when set
const STAGE_VIDEO_POSTER = ""; // optional first-frame image

// The white shade laid over the footage. VIDEO_STRENGTH is how much of the
// video comes through: 0 = solid white, 1 = no shade at all. 0.45 gives a
// 55% white wash. Raise it to show more video, lower it for a whiter stage.
const STAGE_OVERLAY = "#ffffff";
const VIDEO_STRENGTH = 0.45;
const STAGE_VIDEO_FILTER = "grayscale(0.3) contrast(1.04)";

/* ── Motion ──────────────────────────────────────────────────────────────── */

const REVEAL_START = "top 84%";
const FADE_Y = 26;
const WIPE_DURATION = 1.35;
const PHOTO_SCALE_FROM = 1.14;
const SWAP_MS = 620; // text reveal when the product changes
const REVEAL_MS = 900; // image wipe, left to right, on product / colour change

// Auto-change: steps through every colour of a product, then moves to the next
// product, and loops. Any click restarts the wait. It pauses while the
// section is off screen and while the pointer is on the swatches / thumbnails.
const AUTOPLAY = true;
const AUTO_MS = 4500;

// The heading push-up used by the stage display name.
const HEAD_RISE_FROM = 106; // yPercent
const HEAD_RISE_DURATION = 1.15;
const HEAD_RISE_STAGGER = 0.1;
const HEAD_RISE_EASE = "power4.out";

// Cursor reaction. Raise these for a stronger effect, lower for subtler.
const TILT_MOVE_X = 30; // px the render drifts toward the cursor
const TILT_MOVE_Y = 20;
const TILT_ROT_Y = 12; // degrees of lean
const TILT_ROT_X = 9;
const TILT_SCALE = 0.045; // how much the render swells as the cursor arrives
const TILT_PILL = 22; // px the hotspot pills drift the opposite way
const TILT_NAME = 10; // px the corner names drift the opposite way
const TILT_REACH = 1.6; // how far away the cursor still counts (× render size)
const TILT_DURATION = 0.7;

/* ── Layout ──────────────────────────────────────────────────────────────── */

const PHOTO_FIT = "contain"; // "contain" for cut-outs, "cover" for full renders
const IMAGE_FILTER = "none";

// Breathing room inside the stage.
const STAGE_PAD = "clamp(28px, 5vw, 96px)"; // left / right
const STAGE_PAD_TOP = "clamp(56px, 7vw, 120px)";
const STAGE_PAD_BOTTOM = "clamp(20px, 2.4vw, 40px)"; // kept tight on purpose
// "auto" lets the stage hug its content (no dead space under the thumbnails).
// Set to "100vh" to make it a full-screen stage again.
const STAGE_MIN_HEIGHT = "auto";

// The two levers for section height: the render's footprint, and its shape.
const RENDER_MAX = "clamp(300px, 40vw, 620px)";
const RENDER_ASPECT = "16 / 10";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function ProductSectionShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [active, setActive] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const product = PRODUCTS[active];

  // Switching products always starts back at that product's first colour,
  // so the swatch list and the render never disagree about what's shown.
  const selectProduct = (i: number) => {
    setActive(i);
    setColorIndex(0);
  };

  /* Which render is on screen, and which one is being wiped away. The leaving
     slide keeps its own class for the length of the wipe, then is dropped. */
  const slideKey = `${product.id}-${product.colors[colorIndex].id}`;
  const lastKey = useRef(slideKey);
  const [leaving, setLeaving] = useState<string | null>(null);

  useIsoLayoutEffect(() => {
    if (lastKey.current === slideKey) return;
    setLeaving(lastKey.current);
    lastKey.current = slideKey;
    const t = window.setTimeout(() => setLeaving(null), REVEAL_MS + 60);
    return () => window.clearTimeout(t);
  }, [slideKey]);

  /* Auto-change. The timer re-arms after every change, manual or automatic,
     so a click always gets a full pause before the next move. */
  const [inView, setInView] = useState(false);
  const [holdControls, setHoldControls] = useState(false);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!AUTOPLAY || !inView || holdControls) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const t = window.setTimeout(() => {
      if (colorIndex < product.colors.length - 1) {
        setColorIndex(colorIndex + 1);
      } else {
        setActive((active + 1) % PRODUCTS.length);
        setColorIndex(0);
      }
    }, AUTO_MS);
    return () => window.clearTimeout(t);
  }, [active, colorIndex, inView, holdControls, product.colors.length]);

  useIsoLayoutEffect(() => {
    // Scoped, so ctx.revert() on unmount can never reach another section's
    // tweens or triggers.
    const ctx = gsap.context(() => {
      const root = sectionRef.current;
      if (!root) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // The markup already renders in its finished state, so there is
        // nothing to undo — just skip every tween.
        return;
      }

      const q = gsap.utils.selector(root);

      /* The stage. One timeline so the render, the name, the pills and the
         swatches arrive in a single orchestrated move rather than several
         separate entrances. */
      const stage = q(".prd-stage")[0];
      if (stage) {
        const frame = q(".prd-photo")[0];
        const from = "inset(100% 0% 0% 0%)";
        const displayLines = q(".prd-stage .prd-line");

        // Same starting state as any masked heading, set before the trigger
        // so the name is never briefly visible in its finished position.
        gsap.set(displayLines, { yPercent: HEAD_RISE_FROM, opacity: 0 });

        const tl = gsap.timeline({
          scrollTrigger: { trigger: stage, start: REVEAL_START, once: true },
        });

        tl.fromTo(
          frame,
          { clipPath: from, webkitClipPath: from },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            webkitClipPath: "inset(0% 0% 0% 0%)",
            duration: WIPE_DURATION,
            ease: "power3.inOut",
          }
        )
          .fromTo(
            q(".prd-photo-inner"),
            { scale: PHOTO_SCALE_FROM },
            { scale: 1, duration: WIPE_DURATION + 0.6, ease: "power3.out" },
            0
          )
          // The display name's own push-up, values and all.
          .to(
            displayLines,
            {
              yPercent: 0,
              opacity: 1,
              duration: HEAD_RISE_DURATION,
              ease: HEAD_RISE_EASE,
              stagger: HEAD_RISE_STAGGER,
            },
            0.2
          )
          .fromTo(
            q(".prd-feat-rule"),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.8, ease: "power3.inOut", stagger: 0.09 },
            0.55
          )
          .fromTo(
            q(".prd-feat-text"),
            { opacity: 0, y: FADE_Y },
            { opacity: 1, y: 0, duration: 0.95, ease: "power3.out", stagger: 0.09 },
            0.6
          )
          .fromTo(
            q(".prd-hotspot"),
            { opacity: 0, scale: 0.86 },
            { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)", stagger: 0.12 },
            0.85
          )
          .fromTo(
            q(".prd-blurb"),
            { opacity: 0, y: FADE_Y },
            { opacity: 1, y: 0, duration: 0.95, ease: "power3.out" },
            0.95
          )
          .fromTo(
            q(".prd-swatch"),
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.06 },
            1.0
          )
          .fromTo(
            q(".prd-thumb"),
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.1 },
            1.1
          );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  /* Background video. Driven from here because the markup alone is not enough:
     `muted` has to be a DOM property before play(), and play() rejects. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // The property, not the attribute. Without this, autoplay is blocked.
    video.muted = true;
    video.defaultMuted = true;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onReady = () => {
      setVideoReady(true);
      if (!reduce) {
        // Rejects on autoplay policy, an aborted load, a tab in the
        // background. None of those are worth an unhandled rejection.
        video.play().catch(() => {});
      }
    };

    if (video.readyState >= 2) onReady();
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);

    // Some browsers only allow play() after the first interaction. One retry,
    // then we stop asking.
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

  /* Cursor reaction: as the pointer comes near, the render drifts, leans and
     swells toward it; the hotspot pills and corner names drift the opposite
     way for depth. Listens on the window, so it works wherever the pointer is
     on the page. Skipped for touch devices and reduced motion. */
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const render = root.querySelector<HTMLElement>(".prd-render");
    const tilt = root.querySelector<HTMLElement>(".prd-tilt");
    if (!render || !tilt) return;

    const pills = gsap.utils.toArray<HTMLElement>(".prd-hotspot", root);
    const names = gsap.utils.toArray<HTMLElement>(".prd-display", root);
    const opts = { duration: TILT_DURATION, ease: "power3.out" };

    const mx = gsap.quickTo(tilt, "x", opts);
    const my = gsap.quickTo(tilt, "y", opts);
    const ry = gsap.quickTo(tilt, "rotationY", opts);
    const rx = gsap.quickTo(tilt, "rotationX", opts);
    const sc = gsap.quickTo(tilt, "scale", opts);
    const follow = (el: HTMLElement) => ({
      x: gsap.quickTo(el, "x", opts),
      y: gsap.quickTo(el, "y", opts),
    });
    const pillMoves = pills.map(follow);
    const nameMoves = names.map(follow);

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

    const apply = (nx: number, ny: number, near: number) => {
      mx(nx * TILT_MOVE_X);
      my(ny * TILT_MOVE_Y);
      ry(nx * TILT_ROT_Y);
      rx(-ny * TILT_ROT_X);
      sc(1 + near * TILT_SCALE);
      pillMoves.forEach((m) => {
        m.x(-nx * TILT_PILL);
        m.y(-ny * TILT_PILL * 0.6);
      });
      nameMoves.forEach((m) => {
        m.x(-nx * TILT_NAME);
        m.y(-ny * TILT_NAME * 0.6);
      });
    };

    const onMove = (e: PointerEvent) => {
      const r = render.getBoundingClientRect();
      // Scrolled out of view: settle back to rest.
      if (r.bottom < 0 || r.top > window.innerHeight) {
        apply(0, 0, 0);
        return;
      }
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const reach = Math.max(r.width, r.height) * TILT_REACH;
      // 1 with the cursor on the render's centre, fading to 0 at `reach` away.
      const raw = clamp(1 - Math.hypot(dx, dy) / reach, 0, 1);
      const near = raw * raw * (3 - 2 * raw); // smoothstep
      apply(
        clamp(dx / (r.width / 2), -1, 1) * near,
        clamp(dy / (r.height / 2), -1, 1) * near,
        near
      );
    };
    const onLeave = () => apply(0, 0, 0);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const shot = (src: string, id: string) =>
    failed[id] ? (
      <span className="prd-missing">No image</span>
    ) : (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed((f) => ({ ...f, [id]: true }))}
      />
    );

  return (
    <section ref={sectionRef} className="prd" aria-label="Our product range">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&display=swap');

        @keyframes abtHueShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Product / colour switch. Kept in CSS so it never touches the inline
           styles GSAP owns on the entrance. */
        @keyframes prdSwapIn {
          from { opacity: 0; clip-path: inset(0 100% 0 0); transform: translateX(-18px); }
          to   { opacity: 1; clip-path: inset(0 0 0 0);    transform: translateX(0); }
        }

        /* Image swap: the incoming render wipes in from the left edge to the
           right while its picture settles from a slight zoom. */
        @keyframes prdRevealLR {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0 0 0); }
        }
        @keyframes prdRevealImg {
          from { transform: scale(1.12) translateX(-3%); }
          to   { transform: scale(1) translateX(0); }
        }
        /* The outgoing render is erased by the same moving edge, so the two
           are complementary at every moment and never overlap. */
        @keyframes prdHideLR {
          from { clip-path: inset(0 0 0 0); }
          to   { clip-path: inset(0 0 0 100%); }
        }

        /* The shining, colour-shifting title treatment. Sits on the line span
           rather than the <h2>/<p> because background-clip: text paints from
           whichever element owns the background — an ancestor's gradient
           would not be clipped by the mask's overflow: hidden. Both halves of
           the stage name use this, so the whole title shines. */
        .abt-heading {
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          background: linear-gradient(90deg, #0d2233, #17536f, #2f8fbd, #10405a, #0d2233);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          display: inline-block;
          animation: abtHueShift 6s ease-in-out infinite;
        }

        .prd {
          position: relative;
          background: ${BG};
          overflow-x: clip;
          padding: clamp(40px, 5vh, 64px) 0 0;
          color: ${INK};
        }

        /* ---- Stage: full bleed, named-area grid over the video ----
           features | render | right-middle stack (blurb, swatches, thumbs). */
        .prd-stage {
          position: relative;
          box-sizing: border-box;
          width: 100%;
          min-height: ${STAGE_MIN_HEIGHT};
          background: ${PLATE};
          padding: ${STAGE_PAD_TOP} ${STAGE_PAD} ${STAGE_PAD_BOTTOM};

          display: grid;
          grid-template-columns:
            minmax(200px, 0.7fr)
            minmax(0, 2.2fr)
            minmax(200px, 0.7fr);
          /* The right column stacks blurb, swatches and thumbnails in the
             middle rows; the flexible rows above and below centre them. */
          grid-template-rows: minmax(0, 1fr) auto auto auto minmax(0, 1fr);
          grid-template-areas:
            "features render  ."
            "features render  blurb"
            "features render  swatches"
            "features render  foot"
            "features render  .";
          column-gap: clamp(24px, 3vw, 56px);
          row-gap: clamp(18px, 2.4vw, 36px);
          align-items: start;
          align-content: center;
          isolation: isolate;

          --title-size: clamp(3rem, 7.6vw, 7rem);
          --name-size: clamp(2.8rem, 7vw, 6.4rem);
        }

        /* Background footage. Under everything; PLATE shows through until it
           can play, and stays if it never does. */
        .prd-stage-media {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          opacity: 0;
          transition: opacity 900ms ease;
        }
        .prd-stage-media.is-ready { opacity: 1; }

        .prd-stage-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          filter: ${STAGE_VIDEO_FILTER};
        }

        /* White shade over the footage, at (1 - VIDEO_STRENGTH) opacity. */
        .prd-stage-scrim {
          position: absolute;
          inset: 0;
          background: ${STAGE_OVERLAY};
          opacity: ${1 - VIDEO_STRENGTH};
        }

        /* Section heading: first thing in the stage, centred over the video. */
        .prd-title {
          grid-area: title;
          justify-self: center;
          margin: 0;
          font-weight: 400;
          font-size: var(--title-size);
          line-height: 0.95;
          letter-spacing: 0.015em;
          text-align: center;
          white-space: nowrap;
          z-index: 1;
        }

        /* Product name, pinned to the render's corners: the lead word sits
           above the top-left corner, the trail word below the bottom-right. */
        .prd-display {
          position: absolute;
          margin: 0;
          font-weight: 400;
          font-size: var(--name-size);
          line-height: 0.95;
          letter-spacing: 0.015em;
          z-index: 1;
          pointer-events: none;
          white-space: nowrap;
        }
        .prd-display--lead {
          left: 0;
          bottom: 100%;
          margin-bottom: clamp(6px, 0.8vw, 12px);
          text-align: left;
        }
        .prd-display--trail {
          right: 0;
          top: 100%;
          margin-top: clamp(6px, 0.8vw, 12px);
          text-align: right;
        }

        /* One mask and one riser, shared by both halves of the display name. */
        .prd-mask { display: block; overflow: hidden; padding-bottom: 0.06em; }
        .prd-line { display: block; will-change: transform, opacity; }

        .prd-display-text {
          display: block;
          animation: prdSwapIn ${SWAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        /* Text follows the image, one piece after another. */
        .prd-display--trail .prd-display-text { animation-delay: 120ms; }
        .prd-feat:nth-child(2) .prd-feat-text { animation-delay: 90ms; }
        .prd-feat:nth-child(3) .prd-feat-text { animation-delay: 180ms; }
        .prd-blurb span { animation-delay: 240ms; }

        /* Render zone. Holds the tilt wrapper (frame + hotspots), so both stay
           locked to the sheet rather than to the stage. */
        .prd-render {
          grid-area: render;
          position: relative;
          z-index: 2;
          align-self: center;
          justify-self: center;
          width: 100%;
          max-width: ${RENDER_MAX};
          aspect-ratio: ${RENDER_ASPECT};
          perspective: 1000px;
          /* room above and below for the corner-pinned names */
          margin-block: calc(var(--name-size) * 1.1 + 16px);
        }

        /* Cursor-reaction layer. A separate element from .prd-photo so it
           never fights the clip-path entrance tween. */
        .prd-tilt {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          will-change: transform;
        }

        .prd-photo { position: absolute; inset: 0; will-change: clip-path; }
        .prd-photo-inner { position: absolute; inset: 0; will-change: transform; }

        /* The incoming render wipes in from the left while the outgoing one
           is wiped away by the same edge (same duration, same easing), so
           cut-out PNGs never show through each other. */
        .prd-photo-slide {
          position: absolute;
          inset: 0;
          z-index: 1;
          opacity: 0;
        }
        .prd-photo-slide.is-active {
          z-index: 2;
          opacity: 1;
          animation: prdRevealLR ${REVEAL_MS}ms cubic-bezier(0.77, 0, 0.175, 1) both;
        }
        .prd-photo-slide.is-active img {
          animation: prdRevealImg ${REVEAL_MS + 350}ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .prd-photo-slide.is-leaving {
          opacity: 1;
          animation: prdHideLR ${REVEAL_MS}ms cubic-bezier(0.77, 0, 0.175, 1) both;
        }

        .prd-photo img {
          width: 100%;
          height: 100%;
          object-fit: ${PHOTO_FIT};
          object-position: center;
          display: block;
          filter: ${IMAGE_FILTER};
        }

        /* ---- Feature callouts (left column) ---- */
        .prd-features {
          grid-area: features;
          z-index: 3;
          align-self: center;
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: clamp(14px, 1.8vw, 24px);
        }

        .prd-feat { display: grid; gap: 8px; }
        .prd-feat-rule {
          display: block;
          height: 1px;
          background: ${LINE};
          transform-origin: right center;
          will-change: transform;
        }
        .prd-feat-text {
          margin: 0;
          text-align: right;
          font: 400 0.82rem/1.5 'Inter', system-ui, sans-serif;
          color: ${MUTED};
          will-change: transform, opacity;
          animation: prdSwapIn ${SWAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        /* ---- Hotspots: anchored inside the render box ---- */
        .prd-hot {
          position: absolute;
          z-index: 4;
          transform: translate(-50%, -50%);
        }
        .prd-hotspot {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 6px 6px 15px;
          background: ${BG};
          border: 1px solid ${LINE};
          border-radius: 999px;
          box-shadow: 0 6px 24px rgba(22, 36, 46, 0.08);
          will-change: transform, opacity;
        }
        .prd-hotspot-label {
          font: 500 0.72rem/1 'Inter', system-ui, sans-serif;
          letter-spacing: 0.02em;
          color: ${INK};
          white-space: nowrap;
        }
        .prd-hotspot-dot {
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: ${ACCENT};
          color: #fff;
          flex: 0 0 auto;
        }
        .prd-hotspot-dot svg { width: 11px; height: 11px; }

        /* ---- Blurb (top of the right column, under the trail name) ---- */
        .prd-blurb {
          grid-area: blurb;
          z-index: 3;
          align-self: start;
          justify-self: end;
          max-width: 28ch;
          margin: 0;
          text-align: right;
          font: 400 0.88rem/1.6 'Inter', system-ui, sans-serif;
          color: ${MUTED};
          will-change: transform, opacity;
        }
        .prd-blurb span {
          display: block;
          animation: prdSwapIn ${SWAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        /* ---- Colour variant picker (right side of the stage) ---- */
        .prd-swatches {
          grid-area: swatches;
          z-index: 5;
          align-self: start;
          justify-self: end;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 2px;
        }

        .prd-swatch {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          padding: 0;
          border: 2px solid ${BG};
          box-shadow: 0 0 0 1px ${LINE}, 0 4px 10px rgba(22, 36, 46, 0.12);
          cursor: pointer;
          transition: transform 250ms ease, box-shadow 250ms ease;
        }
        .prd-swatch[aria-pressed="true"] {
          transform: scale(1.18);
          box-shadow: 0 0 0 2px ${ACCENT}, 0 4px 10px rgba(22, 36, 46, 0.18);
        }
        .prd-swatch:focus-visible {
          outline: 2px solid ${ACCENT};
          outline-offset: 3px;
        }

        /* ---- Foot: the product switch ---- */
        .prd-foot {
          grid-area: foot;
          z-index: 5;
          align-self: start;
          justify-self: end;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: clamp(4px, 0.8vw, 12px);
        }

        .prd-thumb {
          position: relative;
          width: clamp(56px, 5.4vw, 72px);
          aspect-ratio: 1 / 1;
          padding: 0;
          overflow: hidden;
          border: 1px solid ${LINE};
          background: ${BG};
          cursor: pointer;
          transition: border-color 350ms ease, transform 350ms ease;
          will-change: transform, opacity;
        }
        .prd-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .prd-thumb[aria-pressed="true"] { border-color: ${ACCENT}; transform: translateY(-5px); }
        .prd-thumb:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 3px; }

        .prd-missing {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 8%;
          font: 0.72rem/1.4 'Inter', system-ui, sans-serif;
          color: ${MUTED};
          background: #eceff2;
        }

        /* ---- Responsive ---- */
        @media (max-width: 1180px) {
          .prd-render { max-width: clamp(320px, 46vw, 520px); }
        }

        /* Below this the three columns cannot hold a readable measure, so the
           stage unstacks into one column and the hotspots step aside. */
        @media (max-width: 900px) {
          .prd { padding: clamp(32px, 4vh, 48px) 0 0; }

          .prd-stage {
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: auto;
            grid-template-areas:
              "render"
              "features"
              "blurb"
              "swatches"
              "foot";
            row-gap: clamp(14px, 3.5vw, 22px);
            padding: 40px 22px 20px;
            --title-size: clamp(2.6rem, 13vw, 4.4rem);
            --name-size: clamp(2.3rem, 11.5vw, 3.8rem);
          }
          .prd-title { white-space: normal; }
          .prd-render { max-width: 420px; justify-self: center; }
          .prd-features { justify-self: stretch; }
          .prd-feat-text { text-align: left; }
          .prd-feat-rule { transform-origin: left center; }
          .prd-hot { display: none; }
          .prd-blurb { justify-self: start; align-self: start; text-align: left; max-width: none; }
          .prd-swatches { justify-self: start; justify-content: flex-start; }
          .prd-foot { justify-content: flex-start; margin-top: clamp(16px, 4vw, 24px); }
        }

        /* ---- Reduced motion: everything resolves, nothing moves ---- */
        @media (prefers-reduced-motion: reduce) {
          .abt-heading { animation: none; }
          .prd-photo-slide.is-active,
          .prd-photo-slide.is-active img { animation: none; }
          .prd-photo-slide.is-leaving { animation: none; opacity: 0; }
          .prd-display-text,
          .prd-feat-text,
          .prd-blurb span { animation: none; }
        }
      `}</style>

      {/* Stage. Full bleed — no shell. */}
      <div className="prd-stage">
        {!videoFailed && (
          <div
            className={`prd-stage-media${videoReady ? " is-ready" : ""}`}
            aria-hidden="true"
          >
            <video
              ref={videoRef}
              className="prd-stage-video"
              poster={STAGE_VIDEO_POSTER || undefined}
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
                    `[ProductSection] Stage video failed to load: ${STAGE_VIDEO}. ` +
                      `It should sit at public${STAGE_VIDEO}.`
                  );
                }
              }}
            >
              {STAGE_VIDEO_WEBM && <source src={STAGE_VIDEO_WEBM} type="video/webm" />}
              <source src={STAGE_VIDEO} type="video/mp4" />
            </video>
            <span className="prd-stage-scrim" />
          </div>
        )}

        {/* Render zone. The names sit at its corners; the tilt wrapper carries both the frame and the
            hotspots so they move together toward the cursor. Every
            product × colour combination stays mounted so both a product swap
            and a colour swap use the same crossfade. */}
        <div className="prd-render">
          {/* Product name, pinned to the image's corners. Keys drive the
              product swap. */}
          <h3 className="prd-display prd-display--lead">
            <span className="prd-mask">
              <span className="prd-line">
                <span className="prd-display-text" key={`d1-${product.id}`}>
                  <span className="abt-heading">{product.display[0]}</span>
                </span>
              </span>
            </span>
          </h3>

          <h3 className="prd-display prd-display--trail">
            <span className="prd-mask">
              <span className="prd-line">
                <span className="prd-display-text" key={`d2-${product.id}`}>
                  <span className="abt-heading">{product.display[1]}</span>
                </span>
              </span>
            </span>
          </h3>

          <div className="prd-tilt">
            <div className="prd-photo">
              <div className="prd-photo-inner">
                {PRODUCTS.map((p) =>
                  p.colors.map((c, ci) => {
                    const isActive = p.id === product.id && ci === colorIndex;
                    const isLeaving = !isActive && leaving === `${p.id}-${c.id}`;
                    return (
                      <div
                        className={`prd-photo-slide${isActive ? " is-active" : ""}${
                          isLeaving ? " is-leaving" : ""
                        }`}
                        aria-hidden={!isActive}
                        key={`ph-${p.id}-${c.id}`}
                      >
                        {shot(c.src, `ph-${p.id}-${c.id}`)}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {product.hotspots.map((h, i) => (
              <div className="prd-hot" style={{ left: `${h.x}%`, top: `${h.y}%` }} key={`hs-${i}`}>
                <div className="prd-hotspot">
                  <span className="prd-hotspot-label" key={`hsl-${product.id}-${i}`}>
                    {h.label}
                  </span>
                  <span className="prd-hotspot-dot" aria-hidden="true">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M3 9 9 3M4.2 3H9v4.8" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature callouts. Fixed slots, swapping text. */}
        <ul className="prd-features">
          {product.features.map((f, i) => (
            <li className="prd-feat" key={`fe-${i}`}>
              <span className="prd-feat-rule" />
              <p className="prd-feat-text" key={`fet-${product.id}-${i}`}>
                {f}
              </p>
            </li>
          ))}
        </ul>

        <p className="prd-blurb">
          <span key={`bl-${product.id}`}>{product.note}</span>
        </p>

        {/* Colour variant picker. Four swatches per product; picking one only
            swaps which render is shown, never the active product. */}
        <div
          className="prd-swatches"
          role="group"
          aria-label="Choose a colour"
          onPointerEnter={() => setHoldControls(true)}
          onPointerLeave={() => setHoldControls(false)}
          onFocus={() => setHoldControls(true)}
          onBlur={() => setHoldControls(false)}
        >
          {product.colors.map((c, i) => (
            <button
              key={`sw-${product.id}-${c.id}`}
              type="button"
              className="prd-swatch"
              style={{ background: c.hex }}
              aria-pressed={i === colorIndex}
              aria-label={c.label}
              title={c.label}
              onClick={() => setColorIndex(i)}
            />
          ))}
        </div>

        <div
          className="prd-foot"
          onPointerEnter={() => setHoldControls(true)}
          onPointerLeave={() => setHoldControls(false)}
          onFocus={() => setHoldControls(true)}
          onBlur={() => setHoldControls(false)}
        >
          {PRODUCTS.map((p, i) => (
            <button
              className="prd-thumb"
              type="button"
              aria-pressed={i === active}
              aria-label={`Show ${p.display.join(" ")}`}
              onClick={() => selectProduct(i)}
              key={`th-${p.id}`}
            >
              {shot(p.colors[0].src, `th-${p.id}`)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}