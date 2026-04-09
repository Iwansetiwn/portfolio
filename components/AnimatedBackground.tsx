"use client";

import { motion } from "framer-motion";

export default function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {/* Layer 1: Base radial gradient — establishes the purple tonal foundation */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(100,13,107,0.35) 0%, transparent 70%), " +
            "radial-gradient(ellipse 60% 50% at 80% 100%, rgba(194,57,179,0.18) 0%, transparent 65%), " +
            "radial-gradient(ellipse 50% 40% at 10% 80%, rgba(100,13,107,0.20) 0%, transparent 60%)",
        }}
      />

      {/* Layer 2: Floating aurora orbs */}

      {/* Orb A — large primary purple, top-left quadrant */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 700,
          height: 700,
          top: "-15%",
          left: "-10%",
          background:
            "radial-gradient(circle, rgba(100,13,107,0.30) 0%, rgba(100,13,107,0.08) 50%, transparent 75%)",
          filter: "blur(80px)",
          animation: "orb-drift-1 22s ease-in-out infinite",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      />

      {/* Orb B — medium magenta, bottom-right */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 550,
          height: 550,
          bottom: "-5%",
          right: "-8%",
          background:
            "radial-gradient(circle, rgba(194,57,179,0.22) 0%, rgba(194,57,179,0.06) 50%, transparent 75%)",
          filter: "blur(70px)",
          animation: "orb-drift-2 28s ease-in-out infinite",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
      />

      {/* Orb C — small accent highlight, center-right, aurora streak feel */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 400,
          height: 280,
          top: "40%",
          right: "15%",
          background:
            "radial-gradient(ellipse, rgba(232,93,222,0.18) 0%, rgba(100,13,107,0.05) 60%, transparent 80%)",
          filter: "blur(60px)",
          animation: "orb-drift-3 18s ease-in-out infinite",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 1 }}
      />

      {/* Orb D — subtle deep violet, bottom-left, balances the composition */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          bottom: "10%",
          left: "5%",
          background:
            "radial-gradient(circle, rgba(74,10,80,0.28) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "orb-drift-1 35s ease-in-out infinite reverse",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 1.5 }}
      />

      {/* Layer 3: Dot-grid mesh overlay — subtle purple-tinted grid that pulses */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(194,57,179,0.18) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          animation: "grid-pulse 8s ease-in-out infinite",
        }}
      />
    </div>
  );
}
