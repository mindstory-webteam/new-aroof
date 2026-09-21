"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Footer — link columns on top, one oversized heading along the bottom
 * ------------------------------------------------------------------------------
 *
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │  UPVC Roofing          Products        Help          Contact         │
 *   │  Short line about      Tile sheet      Questions     +91 …           │
 *   │  what you sell.        Trafford sheet  Get a quote   hello@…         │
 *   │                        Colours                       Address         │
 *   │  ────────────────────────────────────────────────────────────────    │
 *   │  © 2026 UPVC Roofing                            Privacy    Terms     │
 *   │                                                                      │
 *   │  A ROOF       (fills the full width, fading out toward the bottom)    │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * Same palette, fonts and shining Anton treatment as the product, FAQ and CTA
 * sections. The background is the CTA's deep blue, one step darker, so the two
 * read as one closing block.
 *
 * BIG HEADING
 * -----------
 * The size is worked out from the text itself, so any words, short or long,
 * fill exactly the width of the content. It re-fits on resize and once the
 * Anton font has loaded. The bottom of the letters fades out into the footer
 * background (FADE_FROM sets where the fade starts). It is decorative
 * (aria-hidden), so screen readers skip it.
 *
 * MOTION
 * ------
 * One entrance, played once when the big heading scrolls into view: it pushes
 * up out of its mask. Link underlines draw in on hover and focus. All of it is
 * skipped for reduced motion.
 *
 * SETUP
 * -----
 * 1. `npm i gsap`
 * 2. Edit BRAND, BIG_WORD, TAGLINE, COLUMNS, CONTACT and LEGAL below. Every value shown
 *    is a placeholder.
 * 3. Move the font @import to your global stylesheet for production.
 */

/* ── Content ─────────────────────────────────────────────────────────────── */

const BRAND = "UPVC Roofing";
const BIG_WORD = "A ROOF"; // the big heading along the bottom
const TAGLINE =
  "UPVC roofing sheets for homes, shops and sheds. Tile and Trafford profiles, four colours each.";

const COLUMNS = [
  {
    title: "Products",
    links: [
      { label: "Tile sheet", href: "#products" },
      { label: "Trafford sheet", href: "#products" },
      { label: "Colours", href: "#products" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Questions and answers", href: "#faq" },
      { label: "Get a quote", href: "#contact" },
    ],
  },
] as const;

const CONTACT = {
  phone: "+91 00000 00000",
  phoneHref: "tel:+910000000000",
  email: "hello@example.com",
  address: ["Street address", "City, State PIN"],
};

const LEGAL = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

const YEAR = new Date().getFullYear();

/* ── Palette (shared with the other sections) ────────────────────────────── */

const FOOT = "#091a27";
const TEXT = "rgba(255, 255, 255, 0.74)";
const FAINT = "rgba(255, 255, 255, 0.62)";
const LINE = "rgba(255, 255, 255, 0.16)";

/* ── Motion ──────────────────────────────────────────────────────────────── */

const REVEAL_START = "top 92%";
const RISE_FROM = 106; // heading push-up, yPercent
const RISE_EASE = "power4.out";

/* ── Layout ──────────────────────────────────────────────────────────────── */

const PAD_X = "clamp(24px, 5vw, 96px)";
const FADE_FROM = "30%"; // where the big heading starts to fade (0% = top, 100% = bottom)

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);

  /* Size the big heading so the text fills the box exactly. */
  useIsoLayoutEffect(() => {
    const box = boxRef.current;
    const word = wordRef.current;
    if (!box || !word) return;

    let lastWidth = -1;
    const fit = (force = false) => {
      const width = box.clientWidth;
      if (!width || (!force && width === lastWidth)) return;
      lastWidth = width;
      word.style.fontSize = "100px"; // measure at a known size, then scale
      const measured = word.getBoundingClientRect().width;
      if (measured) word.style.fontSize = `${(width / measured) * 100 * 0.995}px`;
    };

    fit(true);
    const ro = new ResizeObserver(() => fit());
    ro.observe(box);

    // Anton may arrive after first paint, and it is narrower than the fallback.
    const refit = () => fit(true);
    const fonts = document.fonts;
    fonts?.ready.then(refit);
    fonts?.addEventListener?.("loadingdone", refit);

    return () => {
      ro.disconnect();
      fonts?.removeEventListener?.("loadingdone", refit);
    };
  }, []);

  /* Entrance. Scoped to the footer so revert() can never touch anything else. */
  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const box = boxRef.current;
      const root = footerRef.current;
      if (!box || !root) return;

      // The markup already renders in its finished state, so reduced motion
      // just skips the tween.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const line = root.querySelector(".ftr-line");
      if (!line) return;

      // Starting state is set before the trigger so nothing flashes in its
      // finished position first.
      gsap.set(line, { yPercent: RISE_FROM, opacity: 0 });

      gsap.to(line, {
        yPercent: 0,
        opacity: 1,
        duration: 1.3,
        ease: RISE_EASE,
        scrollTrigger: { trigger: box, start: REVEAL_START, once: true },
      });
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={footerRef} className="ftr">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&display=swap');

        @keyframes ftrHueShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .ftr {
          position: relative;
          box-sizing: border-box;
          background: ${FOOT};
          color: ${TEXT};
          padding: clamp(56px, 7vw, 104px) ${PAD_X} clamp(12px, 1.6vw, 24px);
          overflow-x: clip;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .ftr-shell { max-width: 1320px; margin: 0 auto; }

        /* ---- Top: brand + link columns ---- */
        .ftr-top {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) repeat(3, minmax(0, 1fr));
          column-gap: clamp(24px, 4vw, 72px);
          row-gap: 40px;
          align-items: start;
        }

        .ftr-brand {
          margin: 0;
          font: 600 1.15rem/1.3 'Inter', system-ui, sans-serif;
          color: #fff;
        }
        .ftr-tagline {
          max-width: 34ch;
          margin: 12px 0 0;
          font: 400 0.95rem/1.65 'Inter', system-ui, sans-serif;
          color: ${TEXT};
        }

        .ftr-h {
          margin: 0 0 16px;
          font: 600 0.95rem/1.3 'Inter', system-ui, sans-serif;
          color: #fff;
        }
        .ftr-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }

        /* Links: the underline draws in from the left on hover and focus. */
        .ftr-link {
          display: inline;
          font: 400 0.95rem/1.5 'Inter', system-ui, sans-serif;
          color: ${TEXT};
          text-decoration: none;
          background: linear-gradient(currentColor, currentColor) left bottom / 0% 1px no-repeat;
          transition: color 250ms ease, background-size 350ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ftr-link:hover,
        .ftr-link:focus-visible { color: #fff; background-size: 100% 1px; }
        .ftr-link:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }

        .ftr-address { font-style: normal; display: grid; gap: 12px; }
        .ftr-lines { margin: 0; font: 400 0.95rem/1.6 'Inter', system-ui, sans-serif; color: ${TEXT}; }

        /* ---- Bottom bar ---- */
        .ftr-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px 32px;
          margin-top: clamp(48px, 6vw, 88px);
          padding-top: 20px;
          border-top: 1px solid ${LINE};
          font: 400 0.85rem/1.5 'Inter', system-ui, sans-serif;
          color: ${FAINT};
        }
        .ftr-copy { margin: 0; }
        .ftr-legal { list-style: none; margin: 0; padding: 0; display: flex; gap: 24px; }
        .ftr-legal .ftr-link { font-size: 0.85rem; color: ${FAINT}; }
        .ftr-legal .ftr-link:hover,
        .ftr-legal .ftr-link:focus-visible { color: #fff; }

        /* ---- The big heading ---- */
        .ftr-word-box {
          margin-top: clamp(20px, 3vw, 48px);
          overflow: hidden; /* the mask the heading pushes up out of */
          /* Bottom fade. The mask sits on this fixed box, not on the moving
             line, so the fade stays put while the heading rises through it. */
          -webkit-mask-image: linear-gradient(180deg, #000 ${FADE_FROM}, rgba(0, 0, 0, 0) 96%);
          mask-image: linear-gradient(180deg, #000 ${FADE_FROM}, rgba(0, 0, 0, 0) 96%);
        }
        .ftr-line { display: block; line-height: 0.92; will-change: transform, opacity; }

        /* Same shining title treatment as the other sections, in mid blues so it
           closes the page without out-shouting the CTA. The gradient lives on
           the innermost span: background-clip: text only paints from the element
           that owns the background. The font size is set from script to fill the
           width; the vw value is the fallback before that runs. */
        .ftr-shine {
          display: inline-block;
          white-space: nowrap;
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          font-weight: 400;
          font-size: 15.5vw;
          letter-spacing: 0.015em;
          text-transform: uppercase;
          background: linear-gradient(90deg, #17536f, #2f8fbd, #a9dcf5, #2f8fbd, #17536f);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          animation: ftrHueShift 6s ease-in-out infinite;
        }

        /* ---- Tablet: brand across the top, columns underneath ---- */
        @media (max-width: 900px) {
          .ftr-top { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .ftr-intro { grid-column: 1 / -1; }
        }
        @media (max-width: 560px) {
          .ftr-top { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ftr-contact { grid-column: 1 / -1; }
        }

        /* ---- Reduced motion: nothing shimmers, no underline animation ---- */
        @media (prefers-reduced-motion: reduce) {
          .ftr-shine { animation: none; }
          .ftr-link { transition: none; }
        }
      `}</style>

      <div className="ftr-shell">
        <div className="ftr-top">
          <div className="ftr-intro">
            <p className="ftr-brand">{BRAND}</p>
            <p className="ftr-tagline">{TAGLINE}</p>
          </div>

          {COLUMNS.map((col) => {
            const id = `ftr-${col.title.toLowerCase()}`;
            return (
              <nav key={col.title} aria-labelledby={id}>
                <h3 className="ftr-h" id={id}>
                  {col.title}
                </h3>
                <ul className="ftr-list">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a className="ftr-link" href={l.href}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}

          <div className="ftr-contact">
            <h3 className="ftr-h">Contact</h3>
            <address className="ftr-address">
              <a className="ftr-link" href={CONTACT.phoneHref}>
                {CONTACT.phone}
              </a>
              <a className="ftr-link" href={`mailto:${CONTACT.email}`}>
                {CONTACT.email}
              </a>
              <p className="ftr-lines">
                {CONTACT.address.map((line, i) => (
                  <React.Fragment key={line}>
                    {i > 0 && <br />}
                    {line}
                  </React.Fragment>
                ))}
              </p>
            </address>
          </div>
        </div>

        <div className="ftr-bar">
          <p className="ftr-copy">
            © {YEAR} {BRAND}. All rights reserved.
          </p>
          <ul className="ftr-legal">
            {LEGAL.map((l) => (
              <li key={l.label}>
                <a className="ftr-link" href={l.href}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div ref={boxRef} className="ftr-word-box" aria-hidden="true">
          <span className="ftr-line">
            <span ref={wordRef} className="ftr-shine">
              {BIG_WORD}
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}