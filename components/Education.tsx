"use client";

import { motion } from "framer-motion";
import { GraduationCap, BadgeCheck } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import { education, certifications } from "@/lib/data";

export default function Education() {
  return (
    <SectionWrapper id="education">
      <div className="glow-line mb-16" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-14"
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Education & <span className="gradient-text">Certifications</span>
        </h2>
        <p className="text-foreground/75 text-sm font-mono">Academic background & credentials</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Education Card */}
        <motion.div
          className="group p-8 rounded-2xl bg-gradient-to-br from-surface/60 to-surface/30 border border-white/5 hover:border-accent/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(194,57,179,0.20)]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-lg bg-accent/15 group-hover:bg-accent/25 transition-colors">
                <GraduationCap size={24} className="text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Education</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-foreground">{education.degree}</p>
                <p className="text-accent text-base mt-2">{education.institution}</p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <span className="inline-block text-sm font-mono text-foreground/75 bg-accent/10 px-4 py-2 rounded-full">
                  Graduated {education.year}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Certifications Card */}
        <motion.div
          className="group p-8 rounded-2xl bg-gradient-to-br from-surface/60 to-surface/30 border border-white/5 hover:border-accent/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(194,57,179,0.20)]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-lg bg-accent/15 group-hover:bg-accent/25 transition-colors">
                <BadgeCheck size={24} className="text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Certifications</h3>
            </div>

            <ul className="space-y-4">
              {certifications.map((cert, i) => (
                <motion.li
                  key={cert}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-transparent group-hover:border-accent/20 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
                  <span className="text-base text-foreground/80">{cert}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
