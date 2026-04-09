"use client";

import { motion } from "framer-motion";
import { Server, Code, Wrench, Users } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import { skillCategories } from "@/lib/data";

const icons = [Server, Code, Wrench, Users];

export default function Skills() {
  return (
    <SectionWrapper id="skills">
      <div className="glow-line mb-16" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-14"
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          My <span className="gradient-text">Skills</span>
        </h2>
        <p className="text-foreground/75 text-sm font-mono">Technologies & competencies</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8">
        {skillCategories.map((cat, i) => {
          const Icon = icons[i];
          return (
            <motion.div
              key={cat.title}
              className="group p-8 rounded-2xl bg-gradient-to-br from-surface/60 to-surface/30 border border-white/5 hover:border-accent/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(194,57,179,0.20)]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
            >
              {/* Background glow */}
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />

              <div className="relative z-10">
                {/* Category Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-accent/15 group-hover:bg-accent/25 transition-colors">
                    <Icon size={24} className="text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{cat.title}</h3>
                </div>

                {/* Skills Grid */}
                <div className="flex flex-wrap gap-3">
                  {cat.skills.map((skill, j) => (
                    <motion.span
                      key={skill}
                      className="px-4 py-2 text-sm rounded-full bg-accent/12 border border-accent/40 text-foreground/90 hover:bg-accent/18 hover:border-accent/60 hover:text-foreground transition-all duration-200 cursor-default"
                      initial={{ opacity: 0, scale: 0.85 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + j * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
