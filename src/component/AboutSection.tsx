"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * AboutSection
 * ------------
 * Sits directly AFTER <ScrollVideoReveal />. Everything in it hangs off one
 * scrubbed GSAP timeline pinned to the section, so the cloud hand-offs, the
 * image entrance and the text reveal all read as a single continuous motion
 * driven by the scrollbar rather than several effects firing independently.
 *
 * WHY THE TIMELINE IS PINNED, AND WHY ScrollReveal CAN'T JUST BE DROPPED IN
 * ------------------------------------------------------------------------
 * ScrollReveal triggers off its own element position: `start: 'top bottom'`,
 * `end: 'bottom bottom'`. That works in normal document flow, where the element
 * travels up the viewport as you scroll. Inside a pinned section it doesn't —
 * the element is frozen in place, its top never approaches the viewport bottom,
 * and the whole reveal resolves in one frame. So the effect is rebuilt here on
 * the section's own progress instead: same construction (block rotation from
 * BASE_ROTATION about a left origin, per-word opacity from BASE_OPACITY, blur
 * from BLUR_STRENGTH to 0, staggered, ease 'none', scrubbed), different trigger.
 *
 * IF YOU KEEP USING ScrollReveal ELSEWHERE ON THIS PAGE
 * -----------------------------------------------------
 * Its cleanup calls `ScrollTrigger.getAll().forEach(t => t.kill())`, which kills
 * every trigger on the page, not just its own — unmount one ScrollReveal and
 * this section's timeline dies with it. Wrap its effect in `gsap.context` and
 * return `ctx.revert()` instead, the way this file does.
 *
 * SETUP
 * -----
 * 1. `npm i gsap`
 * 2. Put your photos in ABOUT_IMAGES.
 * 3. Keep ENTER_FOG_COLOR identical to FOG_COLOR in ScrollVideoReveal, and set
 *    FOG_START there to 0.92 so the two whiteouts don't stack into a dead zone.
 * 4. Set EXIT_FOG_COLOR to the background of whatever section follows.
 * 5. Render immediately after <ScrollVideoReveal /> with nothing in between.
 * 6. Move the Anton @import to your global stylesheet for production.
 */

const ABOUT_IMAGES = [
  "/images/about-1.png",
  "/images/about-2.png",
  "/images/about-3.png",
];

const SLIDE_MS = 4200;
const SLIDE_FADE_MS = 900;

// ScrollReveal's knobs, same names and defaults.
const BASE_OPACITY = 0.1;
const BASE_ROTATION = 3;
const ENABLE_BLUR = true;
const BLUR_STRENGTH = 4;

// How far left the image starts, and how far behind it the copy column trails.
const IMAGE_FROM_X = "-22%";

// ScrollTrigger's debug markers. Turn on while tuning the timeline.
const MARKERS = false;

// Must match FOG_COLOR in ScrollVideoReveal.
const ENTER_FOG_COLOR = "#EEF1F4";
// Background of the section that follows this one.
const EXIT_FOG_COLOR = "#0E1A22";
// The closing cloud. Off — it tints the content dark on the way out, which is
// what you were seeing wash over the copy. Turn it on only if the next section
// is dark enough to need the hand-off.
const SHOW_EXIT_FOG = false;

const SECTION_HEIGHT_VH = 280;

// Fill behind the image. Transparent lets the section colour show through the
// letterbox area a contained image leaves at the edges of the clip.
const FRAME_BACKGROUND = "transparent";

// "contain" keeps the whole image visible inside the clip. "cover" fills the
// clip edge to edge and crops whatever overflows.
const IMAGE_FIT: "contain" | "cover" = "contain";

// Set these to your photos' aspect ratio to remove letterboxing entirely.
const FRAME_ASPECT = "4 / 5";
const FRAME_ASPECT_MOBILE = "4 / 3";

const SHOW_SHADE = false;
const FRAME_SHADOW = false;

const CLIP_SHAPES = {
  // Left edge full height, right edge pulled in top and bottom.
  wedge: "polygon(0% 0%, 100% 18%, 100% 81%, 0% 100%)",
  wedgeFlipped: "polygon(0% 18%, 100% 0%, 100% 100%, 0% 81%)",
  arch: "inset(0 round 46% 46% 20px 20px)",
  rounded: "inset(0 round 32px)",
} as const;
const IMAGE_CLIP = CLIP_SHAPES.wedge;

const HEADING = "Roofing Since 1986";

const BODY =
  "We started with one pressing line and a promise that a roof should outlive the person who paid for it. Four decades on, the sheets we roll still go onto homes in the same districts, fitted by families we know by name. Every coil is tested for salt, sun and monsoon before it earns our mark — because the roof is the one part of a house nobody thinks about until the night it matters.";

const FACTS: { value: string; label: string }[] = [
  { value: "40 yrs", label: "Rolling sheet in Kerala" },
  { value: "0.47 mm", label: "Standard gauge, guaranteed" },
  { value: "12 yr", label: "Weatherproofing warranty" },
];

export default function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const factsRef = useRef<HTMLDivElement>(null);
  const frameWrapRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const enterFogRef = useRef<HTMLDivElement>(null);
  const exitFogRef = useRef<HTMLDivElement>(null);

  const [slide, setSlide] = useState(0);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [timerKey, setTimerKey] = useState(0);

  const words = BODY.split(/(\s+)/);

  useEffect(() => {
    // gsap.context scopes every tween and trigger created inside it to this
    // component, so ctx.revert() on unmount cleans up exactly what this file
    // made and leaves other components' triggers alone.
    const ctx = gsap.context(() => {
      const wordEls = bodyRef.current?.querySelectorAll<HTMLElement>(".word");
      if (!wordEls) return;

      // One timeline, total duration 1, so every position below reads directly
      // as a fraction of the section's scroll.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          pin: pinRef.current,
          pinSpacing: false, // the section already reserves its own height
          anticipatePin: 1,
          markers: MARKERS,
        },
      });

      // Cloud thins out while the content is already arriving underneath it.
      tl.fromTo(enterFogRef.current, { opacity: 1 }, { opacity: 0, duration: 0.08 }, 0);

      // Image enters from the left, dots trailing just behind it.
      tl.fromTo(
        [frameWrapRef.current, dotsRef.current],
        { xPercent: parseFloat(IMAGE_FROM_X), opacity: 0 },
        { xPercent: 0, opacity: 1, duration: 0.22, stagger: 0.04 },
        0.02
      );

      tl.fromTo(
        headingRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.12 },
        0.06
      );

      // ScrollReveal's block rotation: the paragraph unskews about its left edge.
      tl.fromTo(
        bodyRef.current,
        { transformOrigin: "0% 50%", rotate: BASE_ROTATION },
        { rotate: 0, duration: 0.6 },
        0.1
      );

      // The word sweep. `stagger: { amount }` spreads the whole run across a
      // fixed span no matter how many words the copy has — `stagger: 0.05` would
      // scale with word count and run off the end of the timeline.
      tl.fromTo(
        wordEls,
        { opacity: BASE_OPACITY },
        { opacity: 1, duration: 0.12, stagger: { amount: 0.5 } },
        0.12
      );

      if (ENABLE_BLUR) {
        tl.fromTo(
          wordEls,
          { filter: `blur(${BLUR_STRENGTH}px)` },
          { filter: "blur(0px)", duration: 0.12, stagger: { amount: 0.5 } },
          0.12
        );
      }

      tl.fromTo(
        factsRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.08 },
        0.78
      );

      if (SHOW_EXIT_FOG) {
        tl.fromTo(exitFogRef.current, { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.88);
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Only run the carousel while the section is on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || ABOUT_IMAGES.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % ABOUT_IMAGES.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [inView, timerKey]);

  const pickSlide = (i: number) => {
    setSlide(i);
    setTimerKey((k) => k + 1);
  };

  return (
    <section
      ref={sectionRef}
      aria-label="About us"
      style={{ position: "relative", height: `${SECTION_HEIGHT_VH}vh` }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');

        @keyframes abtHueShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .abt-heading {
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          background: linear-gradient(90deg, #0d2233, #17536f, #2f8fbd, #10405a, #0d2233);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: abtHueShift 6s ease-in-out infinite;
        }

        .abt-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
          gap: clamp(32px, 6vw, 96px);
          align-items: center;
          width: min(1240px, 90vw);
          margin: 0 auto;
        }

        .abt-frame-wrap {
          ${FRAME_SHADOW ? "filter: drop-shadow(0 20px 38px rgba(9, 28, 42, 0.28));" : ""}
        }

        .abt-frame {
          position: relative;
          width: 100%;
          aspect-ratio: ${FRAME_ASPECT};
          max-height: 74vh;
          clip-path: ${IMAGE_CLIP};
          -webkit-clip-path: ${IMAGE_CLIP};
          overflow: hidden;
          background: ${FRAME_BACKGROUND};
        }

        .abt-slides { position: absolute; inset: 0; }

        .abt-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity ${SLIDE_FADE_MS}ms ease;
        }
        .abt-slide.is-active { opacity: 1; }

        .abt-slide img {
          width: 100%;
          height: 100%;
          object-fit: ${IMAGE_FIT};
          object-position: center;
          display: block;
        }

        .abt-slide-missing {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 14%;
          font: 0.82rem/1.5 system-ui, sans-serif;
          color: rgba(255, 255, 255, 0.9);
          background: linear-gradient(160deg, #6f8b9c, #3d5566);
        }

        .abt-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(8, 26, 38, 0.32) 0%, transparent 40%, rgba(8, 26, 38, 0.52) 100%),
            radial-gradient(120% 80% at 50% 110%, rgba(8, 26, 38, 0.42) 0%, transparent 60%);
          pointer-events: none;
        }

        /* Dots sit outside the clip so the taper doesn't eat them. */
        .abt-dots {
          display: flex;
          gap: 8px;
          margin-top: 18px;
          padding-left: 2px;
        }

        .abt-dot {
          width: 26px;
          height: 3px;
          border: none;
          padding: 0;
          border-radius: 2px;
          background: rgba(16, 32, 44, 0.22);
          cursor: pointer;
          transition: background 0.3s ease, width 0.3s ease;
        }
        .abt-dot.is-active { width: 44px; background: #17536f; }
        .abt-dot:focus-visible { outline: 2px solid #2f8fbd; outline-offset: 3px; }

        .abt-copy { max-width: 62ch; }

        .abt-body {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: clamp(1.05rem, 1.55vw, 1.4rem);
          line-height: 1.55;
          color: #10202c;
          margin: clamp(20px, 3vh, 34px) 0 0;
        }

        /* inline-block is what makes the per-word transform and blur possible —
           filters and transforms don't apply to inline boxes. */
        .word {
          display: inline-block;
          will-change: opacity, filter;
        }

        .abt-facts {
          display: flex;
          flex-wrap: wrap;
          gap: clamp(20px, 3vw, 56px);
          margin-top: clamp(26px, 4vh, 44px);
          padding-top: clamp(18px, 2.5vh, 28px);
          border-top: 1px solid rgba(16, 32, 44, 0.16);
        }

        .abt-fact-value {
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          font-size: clamp(1.5rem, 2.4vw, 2.1rem);
          line-height: 1;
          color: #10405a;
        }

        .abt-fact-label {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.82rem;
          line-height: 1.4;
          color: rgba(16, 32, 44, 0.62);
          margin-top: 6px;
          max-width: 18ch;
        }

        @keyframes abtFogDriftA {
          0%   { transform: translate(-4%, 2%) scale(1); }
          50%  { transform: translate(5%, -3%) scale(1.15); }
          100% { transform: translate(-4%, 2%) scale(1); }
        }
        @keyframes abtFogDriftB {
          0%   { transform: translate(4%, -2%) scale(1.1); }
          50%  { transform: translate(-5%, 3%) scale(1); }
          100% { transform: translate(4%, -2%) scale(1.1); }
        }

        .abt-fog-cloud {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
          will-change: transform;
        }
        .abt-fog-cloud.a {
          left: -10%; bottom: 4%;
          width: 78vmin; height: 78vmin;
          animation: abtFogDriftA 15s ease-in-out infinite;
        }
        .abt-fog-cloud.b {
          right: -8%; top: 2%;
          width: 66vmin; height: 66vmin;
          animation: abtFogDriftB 19s ease-in-out infinite;
        }

        @media (max-width: 900px) {
          .abt-grid { grid-template-columns: 1fr; gap: 26px; }
          .abt-frame { aspect-ratio: ${FRAME_ASPECT_MOBILE}; max-height: 32vh; }
          .abt-facts { gap: 20px; }
          .abt-dots { margin-top: 14px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .abt-heading, .abt-fog-cloud { animation: none; }
          .abt-slide { transition: none; }
        }
      `}</style>

      <div
        ref={pinRef}
        style={{
          height: "100vh",
          overflow: "hidden",
          background: ENTER_FOG_COLOR,
          display: "flex",
          alignItems: "center",
          position: "relative",
        }}
      >
        <div className="abt-grid">
          {/* Left: wedge-clipped auto carousel, entering from off-frame left */}
          <div>
            <div className="abt-frame-wrap" ref={frameWrapRef}>
              <div className="abt-frame">
                <div className="abt-slides">
                  {ABOUT_IMAGES.map((src, i) => (
                    <div
                      key={src}
                      className={`abt-slide${i === slide ? " is-active" : ""}`}
                      aria-hidden={i !== slide}
                    >
                      {failed[i] ? (
                        <span className="abt-slide-missing">No image at {src}</span>
                      ) : (
                        <img
                          src={src}
                          alt=""
                          onError={() => setFailed((f) => ({ ...f, [i]: true }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {SHOW_SHADE && <span className="abt-shade" />}
              </div>
            </div>

            {ABOUT_IMAGES.length > 1 && (
              <div className="abt-dots" ref={dotsRef}>
                {ABOUT_IMAGES.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    className={`abt-dot${i === slide ? " is-active" : ""}`}
                    aria-label={`Show photo ${i + 1} of ${ABOUT_IMAGES.length}`}
                    aria-pressed={i === slide}
                    onClick={() => pickSlide(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: section-1 heading treatment, then the ScrollReveal word sweep */}
          <div className="abt-copy">
            <h2
              ref={headingRef}
              className="abt-heading"
              style={{
                margin: 0,
                fontSize: "clamp(2.6rem, 6vw, 5.5rem)",
                fontWeight: 400,
                lineHeight: 1.03,
                letterSpacing: "0.01em",
              }}
            >
              {HEADING}
            </h2>

            {/* Split on captured whitespace so the gaps survive as text nodes —
                joining words with a plain space instead would collapse the
                spacing once each word becomes an inline-block. */}
            <p className="abt-body" ref={bodyRef}>
              {words.map((word, i) =>
                /^\s+$/.test(word) ? (
                  word
                ) : (
                  <span className="word" key={i}>
                    {word}
                  </span>
                )
              )}
            </p>

            <div className="abt-facts" ref={factsRef}>
              {FACTS.map((fact) => (
                <div key={fact.label}>
                  <div className="abt-fact-value">{fact.value}</div>
                  <div className="abt-fact-label">{fact.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Incoming cloud — opaque in the previous section's fog colour. */}
        <div
          ref={enterFogRef}
          style={{ position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none" }}
        >
          <div style={{ position: "absolute", inset: 0, background: ENTER_FOG_COLOR }} />
          <div
            className="abt-fog-cloud a"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%)" }}
          />
          <div
            className="abt-fog-cloud b"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.85) 0%, transparent 70%)" }}
          />
        </div>

        {/* Outgoing cloud — same mechanic, tinted to the next section. */}
        {SHOW_EXIT_FOG && (
          <div
            ref={exitFogRef}
            style={{ position: "absolute", inset: 0, zIndex: 7, pointerEvents: "none", opacity: 0 }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(180deg, transparent 0%, ${EXIT_FOG_COLOR}CC 55%, ${EXIT_FOG_COLOR} 100%)`,
              }}
            />
            <div
              className="abt-fog-cloud a"
              style={{ background: `radial-gradient(circle, ${EXIT_FOG_COLOR}E6 0%, transparent 70%)` }}
            />
            <div
              className="abt-fog-cloud b"
              style={{ background: `radial-gradient(circle, ${EXIT_FOG_COLOR}D9 0%, transparent 70%)` }}
            />
          </div>
        )}
      </div>
    </section>
  );
}