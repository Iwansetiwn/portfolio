"use client";

import { motion } from "framer-motion";
import { Building2, Calendar, ChevronRight } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import { experiences } from "@/lib/data";

export default function Experience() {
  return (
    <SectionWrapper id="experience">
      <div className="glow-line mb-16" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-14"
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Work <span className="gradient-text">Experience</span>
        </h2>
        <p className="text-foreground/75 text-sm font-mono">My professional journey</p>
      </motion.div>

      <div className="space-y-6">
        {experiences.map((exp, i) => (
          <motion.div
            key={exp.company}
            className="group relative"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.15 }}
          >
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-surface/60 to-surface/30 border border-white/5 hover:border-accent/30 transition-all duration-300 overflow-hidden group-hover:shadow-[0_0_40px_rgba(194,57,179,0.20)]">
              {/* Background glow on hover */}
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {exp.role}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-base">
                      <div className="flex items-center gap-2 text-accent">
                        <Building2 size={16} />
                        <span className="font-semibold">{exp.company}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-foreground/20" />
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Calendar size={16} />
                        <span className="font-mono text-sm">{exp.period}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlights */}
                <div className="grid md:grid-cols-2 gap-4">
                  {exp.highlights.map((item, j) => (
                    <motion.div
                      key={j}
                      className="flex gap-3 p-3 rounded-lg bg-white/5 border border-transparent group-hover:border-accent/20 transition-colors"
                      initial={{ opacity: 0, x: -15 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + j * 0.08 }}
                    >
                      <ChevronRight
                        size={18}
                        className="text-accent shrink-0 mt-0.5"
                      />
                      <span className="text-sm text-foreground/85 leading-relaxed">
                        {item}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}
