"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * FaqSection — sticky heading on the left, one-at-a-time accordion on the right
 * ------------------------------------------------------------------------------
 *
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │  ROOFING QUESTIONS,     ────────────────────────────────────────     │
 *   │  ANSWERED.              What are UPVC roofing sheets made of?    ✕   │
 *   │                         answer text, opens under the question        │
 *   │  what people ask        ────────────────────────────────────────     │
 *   │  before they choose     Which profile should I choose?           +   │
 *   │                         ────────────────────────────────────────     │
 *   │  (heading stays put     Will the colour fade in sun and monsoon? +   │
 *   │   while the list        ────────────────────────────────────────     │
 *   │   scrolls)              …                                            │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * It uses the same palette, fonts and shining Anton heading as the product
 * section, so the two read as one page.
 *
 * ACCORDION
 * ---------
 * - One answer is open at a time; opening another closes the first. Click the
 *   open one to close it. The first is open to begin with (`OPEN_FIRST`).
 * - Each question is a real <button> inside an <h3>, with aria-expanded and
 *   aria-controls, and each answer is a labelled region. ArrowUp / ArrowDown /
 *   Home / End move between questions.
 * - The answer opens by animating a grid row from 0fr to 1fr, so it needs no
 *   height measurement and works for any answer length. Closed answers are
 *   `visibility: hidden`, so screen readers and Tab skip them.
 *
 * MOTION
 * ------
 * One entrance, played once when the section scrolls into view: the heading
 * pushes up out of its mask, the rules draw from left to right, and the
 * questions reveal left to right behind them. Opening an answer reveals its
 * text left to right as well. All of it is skipped for reduced motion.
 *
 * SEO
 * ---
 * A FAQPage JSON-LD block is generated from the same list, so search engines
 * can read the questions and answers. Keep answers as plain text for that.
 *
 * SETUP
 * -----
 * 1. `npm i gsap`
 * 2. Edit `FAQS` and the two text constants below.
 * 3. Move the font @import to your global stylesheet for production.
 */

/* ── Content ─────────────────────────────────────────────────────────────── */

const HEADING = ["Roofing questions,", "answered."]; // one entry per line
const SUBHEAD = "What people ask before they choose a UPVC roof.";
const NOTE = "Still deciding? Tell us your span and location and we'll suggest a profile.";

const OPEN_FIRST = true;

const FAQS = [
  {
    q: "What are UPVC roofing sheets made of?",
    a: "UPVC is unplasticised PVC, a rigid plastic that does not rust or rot. Our Tile sheet is 2.5 mm across three co-extruded layers with an ASA-coated surface, and our Trafford sheet is a 2.0 mm build with an anti-corrosive underside.",
  },
  {
    q: "Which profile should I choose, Tile or Trafford?",
    a: "Choose Tile when the roof is part of the look: homes, villas and shops where you want the clay-tile profile. Choose Trafford for long spans, warehouses, factories and coastal sheds. Its deep trapezoidal ribs allow wider purlin spacing.",
  },
  {
    q: "Will the colour fade in strong sun and monsoon rain?",
    a: "The ASA-coated surface is designed to resist sun and heavy rain, and the Tile sheet is built to hold its colour through decades of both. You should not need to repaint it.",
  },
  {
    q: "Is it suitable for coastal areas?",
    a: "Yes. Salt air corrodes coated steel, but UPVC does not rust. Trafford adds an anti-corrosive underside for sheds and buildings close to the sea.",
  },
  {
    q: "Will the roof be hot or noisy?",
    a: "UPVC conducts far less heat than metal, so the space under it stays more comfortable than under a metal sheet, and rain falls with a softer sound. A ceiling or insulation layer improves both further.",
  },
  {
    q: "Can people walk on it during installation?",
    a: "Yes, at the purlin. The sheets are built to be walked on there without crazing or creep. Step on the purlin lines rather than the middle of a span, and use a crawl board across wide spans.",
  },
  {
    q: "What colours are available?",
    a: "Tile comes in Terracotta, Charcoal, Forest and Slate. Trafford comes in Brick, Graphite, Olive and Stone. Use the colour swatches in the product section to preview each one on the sheet.",
  },
  {
    q: "How do I clean and maintain it?",
    a: "Rinse with clean water and a soft brush or cloth when dust or leaves collect, and clear the gutters before the monsoon. Avoid solvents and abrasive scrubbers, which can dull the surface.",
  },
];

/* ── Palette (shared with the product section) ───────────────────────────── */

const BG = "#FFFFFF";
const INK = "#16242e";
const MUTED = "rgba(22, 36, 46, 0.62)";
const LINE = "rgba(22, 36, 46, 0.16)";
const ACCENT = "#17536f";

/* ── Motion ──────────────────────────────────────────────────────────────── */

const REVEAL_START = "top 75%";
const RISE_FROM = 106; // heading push-up, yPercent
const RISE_EASE = "power4.out";
const OPEN_MS = 520; // answer open / close

/* ── Layout ──────────────────────────────────────────────────────────────── */

const PAD_X = "clamp(24px, 5vw, 96px)";
const PAD_Y = "clamp(64px, 9vw, 140px)";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function FaqSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState<number | null>(OPEN_FIRST ? 0 : null);

  /* Entrance. Scoped to the section so revert() can never touch anything else. */
  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const root = sectionRef.current;
      if (!root) return;

      // The markup already renders in its finished state, so reduced motion
      // just skips every tween.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const q = gsap.utils.selector(root);
      const lines = q(".faq-line");
      const rules = q(".faq-rule");
      const texts = q(".faq-qtext");
      const icons = q(".faq-icon");
      const sub = q(".faq-sub, .faq-note");

      // Starting states are set before the trigger so nothing flashes in its
      // finished position first.
      gsap.set(lines, { yPercent: RISE_FROM, opacity: 0 });
      gsap.set(sub, { opacity: 0, y: 18 });
      gsap.set(rules, { scaleX: 0 });
      gsap.set(texts, { opacity: 0, x: -18, clipPath: "inset(0 100% 0 0)" });
      gsap.set(icons, { opacity: 0, scale: 0.8 });

      gsap
        .timeline({ scrollTrigger: { trigger: root, start: REVEAL_START, once: true } })
        .to(lines, { yPercent: 0, opacity: 1, duration: 1.15, ease: RISE_EASE, stagger: 0.12 }, 0)
        .to(sub, { opacity: 1, y: 0, duration: 0.95, ease: "power3.out", stagger: 0.1 }, 0.45)
        .to(rules, { scaleX: 1, duration: 0.9, ease: "power3.inOut", stagger: 0.08 }, 0.25)
        .to(
          texts,
          {
            opacity: 1,
            x: 0,
            clipPath: "inset(0 0% 0 0)",
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.08,
          },
          0.45
        )
        .to(icons, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.6)", stagger: 0.08 }, 0.6);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const n = FAQS.length;
    let to: number | null = null;
    if (e.key === "ArrowDown") to = (i + 1) % n;
    else if (e.key === "ArrowUp") to = (i - 1 + n) % n;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = n - 1;
    if (to !== null) {
      e.preventDefault();
      buttons.current[to]?.focus();
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section ref={sectionRef} className="faq" aria-label="Frequently asked questions">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&display=swap');

        @keyframes faqHueShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .faq {
          position: relative;
          box-sizing: border-box;
          background: ${BG};
          color: ${INK};
          padding: ${PAD_Y} ${PAD_X};
          overflow-x: clip;
        }

        .faq-shell {
          max-width: 1320px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(260px, 0.85fr) minmax(0, 1.5fr);
          column-gap: clamp(32px, 6vw, 112px);
          align-items: start;
        }

        /* ---- Left: heading stays in view while the list scrolls ---- */
        .faq-side {
          position: sticky;
          top: clamp(24px, 6vw, 96px);
        }

        .faq-title {
          margin: 0;
          font-weight: 400;
          font-size: clamp(2.6rem, 5.2vw, 5rem);
          line-height: 0.98;
          letter-spacing: 0.015em;
        }
        /* Each line sits in its own mask so it can push up out of it. */
        .faq-mask { display: block; overflow: hidden; padding-bottom: 0.06em; }
        .faq-line { display: block; will-change: transform, opacity; }

        /* The shining title treatment, same as the product section. The
           gradient lives on the innermost span: background-clip: text only
           paints from the element that owns the background. */
        .faq-shine {
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          background: linear-gradient(90deg, #0d2233, #17536f, #2f8fbd, #10405a, #0d2233);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          display: inline-block;
          animation: faqHueShift 6s ease-in-out infinite;
        }

        .faq-sub {
          max-width: 26ch;
          margin: clamp(18px, 2vw, 28px) 0 0;
          font: 400 clamp(1rem, 1.2vw, 1.1rem)/1.55 'Inter', system-ui, sans-serif;
          color: ${INK};
          will-change: transform, opacity;
        }
        .faq-note {
          max-width: 34ch;
          margin: clamp(20px, 2.4vw, 32px) 0 0;
          padding-top: 16px;
          border-top: 1px solid ${LINE};
          font: 400 0.85rem/1.6 'Inter', system-ui, sans-serif;
          color: ${MUTED};
          will-change: transform, opacity;
        }

        /* ---- Right: the accordion ---- */
        .faq-list { margin: 0; padding: 0; }

        .faq-item { position: relative; }

        /* Hairline above each question. It is an element, not a border, so
           the entrance can draw it from left to right. */
        .faq-rule {
          display: block;
          height: 1px;
          background: ${LINE};
          transform-origin: left center;
          will-change: transform;
        }

        .faq-q { margin: 0; font-size: inherit; font-weight: inherit; }

        .faq-btn {
          all: unset;
          box-sizing: border-box;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: clamp(20px, 2.2vw, 30px) 0;
          cursor: pointer;
        }
        .faq-btn:focus-visible {
          outline: 2px solid ${ACCENT};
          outline-offset: 4px;
        }

        .faq-qtext {
          display: block;
          font: 500 clamp(1.02rem, 1.5vw, 1.28rem)/1.35 'Inter', system-ui, sans-serif;
          color: ${INK};
          transition: color 300ms ease;
          will-change: transform, opacity, clip-path;
        }
        .faq-btn:hover .faq-qtext,
        .faq-item.is-open .faq-qtext { color: ${ACCENT}; }

        /* The icon: GSAP owns .faq-icon (entrance), CSS owns .faq-plus
           (rotation), so the two never share a transform. */
        .faq-icon {
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid ${LINE};
          background: transparent;
          transition: background-color 300ms ease, border-color 300ms ease;
          will-change: transform, opacity;
        }
        .faq-btn:hover .faq-icon { border-color: ${ACCENT}; }
        .faq-item.is-open .faq-icon { background: ${ACCENT}; border-color: ${ACCENT}; }

        .faq-plus {
          position: relative;
          width: 12px;
          height: 12px;
          transition: transform ${OPEN_MS}ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .faq-plus::before,
        .faq-plus::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 12px;
          height: 1.5px;
          margin: -0.75px 0 0 -6px;
          background: ${ACCENT};
          transition: background-color 300ms ease;
        }
        .faq-plus::after { transform: rotate(90deg); }
        .faq-item.is-open .faq-plus { transform: rotate(45deg); }
        .faq-item.is-open .faq-plus::before,
        .faq-item.is-open .faq-plus::after { background: #fff; }

        /* Answer. A grid row animating 0fr -> 1fr needs no measuring, so any
           answer length works. Closed answers are also visibility: hidden, so
           they are skipped by screen readers. */
        .faq-panel {
          display: grid;
          grid-template-rows: 0fr;
          visibility: hidden;
          transition:
            grid-template-rows ${OPEN_MS}ms cubic-bezier(0.22, 1, 0.36, 1),
            visibility 0s linear ${OPEN_MS}ms;
        }
        .faq-item.is-open .faq-panel {
          grid-template-rows: 1fr;
          visibility: visible;
          transition:
            grid-template-rows ${OPEN_MS}ms cubic-bezier(0.22, 1, 0.36, 1),
            visibility 0s linear 0s;
        }
        .faq-panel-inner { min-height: 0; overflow: hidden; }

        .faq-answer {
          max-width: 62ch;
          margin: 0;
          padding: 0 clamp(0px, 5vw, 64px) clamp(22px, 2.4vw, 32px) 0;
          font: 400 0.98rem/1.75 'Inter', system-ui, sans-serif;
          color: ${MUTED};
          opacity: 0;
          clip-path: inset(0 100% 0 0);
          transform: translateX(-14px);
          transition:
            opacity ${OPEN_MS}ms ease,
            clip-path ${OPEN_MS + 200}ms cubic-bezier(0.22, 1, 0.36, 1),
            transform ${OPEN_MS + 200}ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .faq-item.is-open .faq-answer {
          opacity: 1;
          clip-path: inset(0 0 0 0);
          transform: translateX(0);
          transition-delay: 120ms;
        }

        /* ---- Small screens: one column, heading no longer sticky ---- */
        @media (max-width: 900px) {
          .faq-shell { grid-template-columns: minmax(0, 1fr); row-gap: clamp(32px, 8vw, 56px); }
          .faq-side { position: static; }
          .faq-title { font-size: clamp(2.3rem, 11vw, 3.6rem); }
          .faq-sub, .faq-note { max-width: none; }
          .faq-answer { padding-right: 0; }
        }

        /* ---- Reduced motion: state changes still show, nothing travels ---- */
        @media (prefers-reduced-motion: reduce) {
          .faq-shine { animation: none; }
          .faq-panel,
          .faq-item.is-open .faq-panel,
          .faq-plus,
          .faq-answer,
          .faq-item.is-open .faq-answer { transition: none; }
          .faq-answer { clip-path: none; transform: none; }
        }
      `}</style>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="faq-shell">
        <div className="faq-side">
          <h2 className="faq-title">
            {HEADING.map((line) => (
              <span className="faq-mask" key={line}>
                <span className="faq-line">
                  <span className="faq-shine">{line}</span>
                </span>
              </span>
            ))}
          </h2>
          <p className="faq-sub">{SUBHEAD}</p>
          <p className="faq-note">{NOTE}</p>
        </div>

        <div className="faq-list">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div className={`faq-item${isOpen ? " is-open" : ""}`} key={f.q}>
                <span className="faq-rule" />
                <h3 className="faq-q">
                  <button
                    ref={(el) => {
                      buttons.current[i] = el;
                    }}
                    type="button"
                    className="faq-btn"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                  >
                    <span className="faq-qtext">{f.q}</span>
                    <span className="faq-icon" aria-hidden="true">
                      <span className="faq-plus" />
                    </span>
                  </button>
                </h3>
                <div
                  className="faq-panel"
                  id={`faq-a-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                >
                  <div className="faq-panel-inner">
                    <p className="faq-answer">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <span className="faq-rule" />
        </div>
      </div>
    </section>
  );
}