"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import { projects } from "@/lib/data";

export default function Projects() {
  return (
    <SectionWrapper id="projects">
      <div className="glow-line mb-16" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-14"
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Featured <span className="gradient-text">Projects</span>
        </h2>
        <p className="text-foreground/75 text-sm font-mono">Things I&apos;ve built</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {projects.map((project, i) => (
          <motion.div
            key={project.title}
            className="group relative"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.15 }}
          >
            <div className="relative h-full p-8 rounded-2xl bg-gradient-to-br from-surface/60 to-surface/30 border border-white/5 hover:border-accent/30 transition-all duration-300 overflow-hidden group-hover:shadow-[0_0_60px_rgba(194,57,179,0.25)] group-hover:-translate-y-2">
              {/* Gradient glow background */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                {/* Header with icon */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground group-hover:text-accent transition-colors mb-2">
                      {project.title}
                    </h3>
                  </div>
                  <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors shrink-0 ml-4">
                    <ArrowUpRight
                      size={20}
                      className="text-accent group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                    />
                  </div>
                </div>

                {/* Description */}
                <p className="text-base text-foreground/85 leading-relaxed mb-8 flex-grow">
                  {project.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, j) => (
                    <motion.span
                      key={tag}
                      className="text-xs font-mono text-accent bg-accent/10 border border-accent/30 px-3 py-1.5 rounded-full hover:bg-accent/20 transition-colors"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + j * 0.05 }}
                    >
                      {tag}
                    </motion.span>
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
