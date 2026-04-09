import Hero from "@/components/Hero";
import About from "@/components/About";
import Experience from "@/components/Experience";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import Education from "@/components/Education";
import Contact from "@/components/Contact";
import Navbar from "@/components/Navbar";
import ScrollDots from "@/components/ScrollDots";

export default function Home() {
  return (
    <>
      <Navbar />
      <ScrollDots />
      <main>
        <Hero />
        <About />
        <Experience />
        <Skills />
        <Projects />
        <Education />
        <Contact />
      </main>
    </>
  );
}
