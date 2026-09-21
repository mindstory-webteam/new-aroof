import AboutSection from "@/component/AboutSection";
import FrameRevealSection from "@/component/FrameRevealSection";
import Navbar from "@/component/Navbar";
import Preloader from "@/component/Preloader";
import ProductSectionRange from "@/component/ProductSectionRange";
import ScrollVideoReveal from "@/component/ScrollVideoReveal";
import Image from "next/image";
import ProductSectionShowcase from "@/component/ProductSectionShowcase";
import RoofHeroSection from "@/component/RoofHeroSection";
import FaqSection from "@/component/FaqSection";

/**
 * OVERLAP_VH — how far up AboutSection is pulled over ScrollVideoReveal, in vh.
 * ScrollVideoReveal pins itself full-screen for its own reserved scroll length
 * (its internal SCRUB_HEIGHT_VH) and releases the pin naturally once the user
 * scrolls past it. Pulling AboutSection up by OVERLAP_VH with a negative
 * margin — combined with a higher z-index, an opaque background, and rounded
 * top corners — makes it read as a solid panel sliding up and covering the
 * video, instead of just appearing after it ends.
 *
 * Increase for a more dramatic cover-up (About starts overlapping earlier,
 * while more of the video/fog is still visible under the rounded edge).
 * Set to 0 for a plain sequential handoff with no overlap.
 */
const OVERLAP_VH = 10;
const CORNER_RADIUS = 28; // px, rounding on AboutSection's top corners

export default function Home() {
  return (
    <div>
      <Preloader />
      <Navbar />
      <RoofHeroSection/>

      {/* Lower stacking layer: pinned video hero, scroll-scrubbed while scrolling */}
      <div style={{ position: "relative", zIndex: 1 }}>
        
        <ScrollVideoReveal />
      </div>

      {/* Higher stacking layer: rises up and covers the video hero as the user
          scrolls past it. Negative margin creates the overlap; rounded top +
          shadow sell the "panel sliding over" effect. */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginTop: `-${OVERLAP_VH}vh`,
          borderTopLeftRadius: CORNER_RADIUS,
          borderTopRightRadius: CORNER_RADIUS,
          overflow: "hidden", // clips AboutSection's own content to the rounded corners
          boxShadow: "0 -24px 60px rgba(0, 0, 0, 0.22)",
          background: "#FFFFFF", // must match AboutSection's own background color
        }}
      >
         
        <AboutSection />
      </div>

      
       <ProductSectionShowcase/>

      <FrameRevealSection />

      <FaqSection/>

     

      

     
    </div>
  );
}