"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const sections = [
  "hero",
  "about",
  "experience",
  "skills",
  "projects",
  "education",
  "contact",
];

export default function ScrollDots() {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      { threshold: 0.35 }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-3">
      {sections.map((id) => (
        <a
          key={id}
          href={`#${id}`}
          className="group relative flex items-center justify-end"
        >
          <span className="absolute right-5 rounded bg-surface px-2 py-1 text-xs text-accent opacity-0 transition-opacity group-hover:opacity-100 capitalize whitespace-nowrap">
            {id}
          </span>
          <motion.span
            className="block rounded-full border border-accent/30"
            animate={{
              width: active === id ? 12 : 8,
              height: active === id ? 12 : 8,
              backgroundColor:
                active === id ? "var(--accent)" : "transparent",
            }}
            transition={{ duration: 0.3 }}
          />
        </a>
      ))}
    </nav>
  );
}
