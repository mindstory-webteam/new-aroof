"use client";

import React, { useEffect, useState } from "react";

/**
 * Navbar
 * ------
 * A floating, glassmorphic navigation bar.
 *
 * - Floating: it doesn't sit flush against the top of the page. It's `fixed`
 *   with a small gap on all sides and rounded corners, so it reads as a pill
 *   hovering over the content. On scroll it lifts slightly (shadow + inset).
 * - Glass: transparent background + backdrop blur + a hairline border, so the
 *   video/hero behind it shows through.
 * - Centered logo: the bar is a 3-column grid — left links | logo | right links —
 *   so the logo stays optically centered regardless of how many links each side has.
 * - Scroll state: once the user scrolls past SCROLL_THRESHOLD px, the background
 *   transitions from clear glass to solid white and the text flips to dark.
 *
 * SETUP
 * -----
 * 1. Put your logo at `public/logo/logo.svg` (light version, for over the hero)
 *    and `public/logo/logo-dark.svg` (dark version, for the white scrolled state).
 *    If you only have one logo, set both constants to the same path and delete
 *    the `filter` swap below.
 * 2. Render <Navbar /> once, high up in your layout (e.g. in app/layout.tsx above
 *    {children}). Because it's `fixed`, it does NOT take up layout space — your
 *    full-screen hero will start at the very top of the viewport, which is what
 *    you want with the ScrollVideoReveal section.
 * 3. Mobile: below MOBILE_BREAKPOINT the split links collapse into a hamburger
 *    that opens a full-screen glass panel.
 */

const LOGO_LIGHT = "logo/logo.png"; // shown while transparent (over dark hero)
const LOGO_DARK = "/logo/logo.png";

// Pixels of scroll before the bar switches to its solid white state.
const SCROLL_THRESHOLD = 60;

type NavLink = { label: string; href: string };

const LEFT_LINKS: NavLink[] = [
  { label: "Products", href: "#products" },
  { label: "Technology", href: "#technology" },
  { label: "Projects", href: "#projects" },
];

const RIGHT_LINKS: NavLink[] = [
  { label: "About", href: "#about" },
  { label: "Dealers", href: "#dealers" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll(); // handle a page loaded already scrolled (refresh mid-page)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile panel is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <style>{`
        .nav-wrap {
          position: fixed;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 40px);
          max-width: 1240px;
          z-index: 1000;
          border-radius: 18px;
          transition:
            background-color 0.35s ease,
            backdrop-filter 0.35s ease,
            box-shadow 0.35s ease,
            border-color 0.35s ease,
            top 0.35s ease,
            transform 0.35s ease;

          /* Glass (default, over the hero) */
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(14px) saturate(160%);
          -webkit-backdrop-filter: blur(14px) saturate(160%);
          box-shadow: 0 8px 30px rgba(0, 20, 40, 0.18);
        }

        /* Scrolled: solid white, tighter to the top, stronger lift */
        .nav-wrap.scrolled {
          top: 12px;
          background: #ffffff;
          border-color: rgba(0, 0, 0, 0.06);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          box-shadow: 0 10px 34px rgba(0, 0, 0, 0.12);
        }

        .nav-inner {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
          padding: 12px 26px;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
        }
        .nav-links.right { justify-content: flex-end; }

        .nav-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .nav-link {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
          position: relative;
          padding: 4px 0;
          color: rgba(255, 255, 255, 0.92);
          transition: color 0.35s ease, opacity 0.2s ease;
        }
        .nav-wrap.scrolled .nav-link { color: #14202c; }
        .nav-link:hover { opacity: 0.7; }

        /* Underline sweep on hover */
        .nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          height: 1.5px;
          width: 0;
          background: currentColor;
          transition: width 0.28s ease;
        }
        .nav-link:hover::after { width: 100%; }

        .nav-logo {
          display: flex;
          align-items: center;
          justify-self: center;
          line-height: 0;
        }
        .nav-logo img {
          height: 34px;
          width: auto;
          display: block;
          transition: height 0.35s ease, opacity 0.25s ease;
        }
        .nav-wrap.scrolled .nav-logo img { height: 30px; }

        /* Hamburger — hidden on desktop */
        .nav-burger {
          display: none;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          width: 34px;
          height: 34px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
        }
        .nav-burger span {
          display: block;
          height: 2px;
          width: 22px;
          border-radius: 2px;
          background: #ffffff;
          transition: background-color 0.35s ease, transform 0.3s ease, opacity 0.2s ease;
        }
        .nav-wrap.scrolled .nav-burger span { background: #14202c; }
        .nav-burger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .nav-burger.open span:nth-child(2) { opacity: 0; }
        .nav-burger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* Mobile drop panel */
        .nav-panel {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 26px;
          background: rgba(10, 18, 28, 0.82);
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .nav-panel.open { opacity: 1; pointer-events: auto; }
        .nav-panel a {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 20px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          color: #ffffff;
        }

        @media (max-width: 900px) {
          .nav-wrap { width: calc(100% - 24px); top: 12px; border-radius: 14px; }
          .nav-inner { grid-template-columns: 1fr auto 1fr; padding: 10px 16px; }
          .nav-links { display: none; }
          .nav-burger { display: flex; }
        }
      `}</style>

      <header className={`nav-wrap${scrolled ? " scrolled" : ""}`}>
        <nav className="nav-inner">
          {/* LEFT: links on desktop, empty spacer on mobile so the logo stays centered */}
          <div className="nav-links left">
            {LEFT_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="nav-link">
                {link.label}
              </a>
            ))}
          </div>

          {/* CENTER: logo. Swaps between light and dark versions on scroll. */}
          <a href="/" className="nav-logo" aria-label="Home">
            <img src={scrolled ? LOGO_DARK : LOGO_LIGHT} alt="Logo" />
          </a>

          {/* RIGHT: links on desktop, hamburger on mobile */}
          <div className="nav-right">
            <div className="nav-links right">
              {RIGHT_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="nav-link">
                  {link.label}
                </a>
              ))}
            </div>
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className={`nav-burger${menuOpen ? " open" : ""}`}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </nav>
      </header>

      {/* Full-screen mobile menu */}
      <div className={`nav-panel${menuOpen ? " open" : ""}`}>
        {[...LEFT_LINKS, ...RIGHT_LINKS].map((link) => (
          <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
            {link.label}
          </a>
        ))}
      </div>
    </>
  );
}