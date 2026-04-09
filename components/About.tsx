"use client";

import { motion } from "framer-motion";
import { Briefcase, Award, Globe } from "lucide-react";
import Image from "next/image";
import SectionWrapper from "./SectionWrapper";
import { personalInfo } from "@/lib/data";

const stats = [
  { icon: Briefcase, label: "Years Experience", value: "2+" },
  { icon: Award, label: "Certifications", value: "3" },
  { icon: Globe, label: "Languages", value: "2" },
];

export default function About() {
  return (
    <SectionWrapper id="about">
      <div className="glow-line mb-16" />

      <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
        {/* Left: Profile Picture - Circular */}
        <motion.div
          className="relative order-2 md:order-1 flex justify-center"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="relative w-80 h-80">
            {/* Accent circles */}
            <div className="absolute -inset-6 rounded-full border border-accent/30 md:flex hidden" />
            <div className="absolute -inset-12 rounded-full border border-accent/15 md:flex hidden" />

            {/* Circular image container */}
            <div className="relative w-full h-full rounded-full overflow-hidden bg-surface/50 border-2 border-accent/40 shadow-2xl">
              <Image
                src="/profile.png"
                alt="Iwan Setiawan"
                fill
                className="object-cover object-center"
              />
            </div>
          </div>
        </motion.div>

        {/* Right: Content */}
        <motion.div
          className="flex flex-col gap-8 order-1 md:order-2"
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          {/* Header */}
          <div>
            <motion.h2
              className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              About <span className="gradient-text">Me</span>
            </motion.h2>
            <motion.p
              className="text-foreground/75 text-sm font-mono tracking-wide"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Who I am & what I do
            </motion.p>
          </div>

          {/* Summary text */}
          <motion.p
            className="text-foreground/85 leading-relaxed text-base max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {personalInfo.summary}
          </motion.p>

          {/* Stats Grid */}
          <motion.div
            className="grid grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ staggerChildren: 0.1, delayChildren: 0.3 }}
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="p-5 rounded-xl bg-surface/50 border border-white/5 hover:border-accent/30 transition-all duration-300 hover:bg-surface/70 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              >
                <div className="flex justify-center mb-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <stat.icon size={20} className="text-accent" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-accent mb-1">{stat.value}</p>
                <p className="text-xs text-foreground/75 uppercase tracking-wide">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
