"use client";

import { motion } from "framer-motion";
import { MapPin, ArrowDown, ExternalLink, Download } from "lucide-react";
import Image from "next/image";
import { personalInfo } from "@/lib/data";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center px-6 md:px-12 lg:px-24 overflow-hidden pt-32"
    >

      <div className="relative z-10 max-w-6xl w-full">
        <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Content */}
          <motion.div
            className="flex flex-col justify-center order-2 md:order-1"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
            }}
          >
            {/* Main Headline */}
            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6 tracking-tight"
              variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
              }}
            >
              {personalInfo.name.split(" ").map((word, idx) => (
                <div key={idx}>
                  {idx === 1 ? (
                    <span className="gradient-text">{word}</span>
                  ) : (
                    word
                  )}
                </div>
              ))}
            </motion.h1>

            {/* Subtitle */}
            <motion.h2
              className="text-xl md:text-2xl text-foreground/85 mb-8 leading-relaxed max-w-lg font-medium"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 } },
              }}
            >
              {personalInfo.title}
            </motion.h2>

            {/* Description */}
            <motion.p
              className="text-foreground/80 text-base mb-10 max-w-md leading-relaxed"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.2 } },
              }}
            >
              Building reliable web solutions with expertise in hosting, technical support, and modern web development.
            </motion.p>

            {/* Quick Stats */}
            <motion.div
              className="grid grid-cols-3 gap-6 mb-12 max-w-md"
              variants={{
                hidden: { opacity: 0 },
                visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
              }}
            >
              {[
                { value: "2+", label: "Years Experience" },
                { value: "3", label: "Certifications" },
                { value: personalInfo.location.split(",")[0], label: "Based in" },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                  }}
                >
                  <p className="text-2xl font-bold text-accent mb-1">{stat.value}</p>
                  <p className="text-xs text-foreground/75 uppercase tracking-wide">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              className="flex gap-4"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.4 } },
              }}
            >
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-background font-semibold rounded-lg hover:bg-accent/90 transition-all duration-300 hover:shadow-[0_0_30px_rgba(194,57,179,0.35)] hover:gap-3"
              >
                Get In Touch
                <ExternalLink size={16} />
              </a>
              <a
                href="/resume.pdf"
                download="Iwan_Setiawan_CV.pdf"
                className="inline-flex items-center gap-2 px-8 py-4 bg-surface/50 border border-accent/30 text-foreground font-semibold rounded-lg hover:bg-surface/70 hover:border-accent/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(194,57,179,0.20)]"
              >
                Download CV
                <Download size={16} />
              </a>
            </motion.div>

          </motion.div>

          {/* Right: Profile Image */}
          <motion.div
            className="relative order-1 md:order-2 flex justify-center"
            initial={{ opacity: 0, scale: 0.95, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative w-80 h-80">
              {/* Accent circles behind image */}
              <div className="absolute -inset-6 rounded-full border border-accent/30 md:flex hidden" />
              <div className="absolute -inset-12 rounded-full border border-accent/15 md:flex hidden" />

              {/* Main circular image container */}
              <div className="relative w-full h-full rounded-full overflow-hidden bg-surface/50 border-2 border-accent/40 shadow-2xl">
                <Image
                  src="/profile.png"
                  alt={personalInfo.name}
                  fill
                  className="object-cover object-center"
                  priority
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        <ArrowDown size={20} className="text-accent/40" />
      </motion.div>
    </section>
  );
}
