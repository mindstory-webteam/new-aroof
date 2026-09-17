
import AboutSection from "@/component/AboutSection";
import FrameRevealSection from "@/component/FrameRevealSection";
import Navbar from "@/component/Navbar";
import Preloader from "@/component/Preloader";
import ScrollVideoReveal from "@/component/ScrollVideoReveal";
import Image from "next/image";

export default function Home() {
  return (
    <div>
      <Preloader/>
      <Navbar/>
      <ScrollVideoReveal/>
      <AboutSection/>
      
      <FrameRevealSection/>
      

    </div>
  );
}
