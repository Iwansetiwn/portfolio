"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import { personalInfo } from "@/lib/data";

const contactItems = [
  { icon: Mail, label: "Email", value: personalInfo.email, href: `mailto:${personalInfo.email}` },
  { icon: Phone, label: "Phone", value: personalInfo.phone, href: `tel:${personalInfo.phone}` },
  { icon: MapPin, label: "Location", value: personalInfo.location, href: null },
];

export default function Contact() {
  return (
    <SectionWrapper id="contact">
      <div className="glow-line mb-16" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-14"
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Get In <span className="gradient-text">Touch</span>
        </h2>
        <p className="text-foreground/75 text-sm font-mono">Let&apos;s work together</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Contact Info */}
        <motion.div
          className="flex flex-col gap-8"
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-lg text-foreground/85 leading-relaxed max-w-md">
            I&apos;m always open to new opportunities and interesting projects.
            Whether you have a question or just want to say hi, feel free to
            reach out!
          </p>

          {contactItems.map((item, i) => (
            <motion.a
              key={item.label}
              href={item.href || "#"}
              className="group flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <div className="p-3 rounded-lg bg-accent/15 group-hover:bg-accent/25 transition-colors shrink-0 mt-1">
                <item.icon size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-xs text-foreground/75 uppercase tracking-wider font-semibold">
                  {item.label}
                </p>
                <p className="text-base text-foreground group-hover:text-accent transition-colors font-medium">
                  {item.value}
                </p>
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* Contact Form */}
        <motion.div
          className="p-8 rounded-2xl bg-gradient-to-br from-surface/60 to-surface/30 border border-white/5"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const name = (form.elements.namedItem("name") as HTMLInputElement).value;
              const email = (form.elements.namedItem("email") as HTMLInputElement).value;
              const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value;
              window.location.href = `mailto:${personalInfo.email}?subject=Portfolio Contact from ${name}&body=${encodeURIComponent(message)}%0A%0AFrom: ${name} (${email})`;
            }}
          >
            <motion.input
              name="name"
              type="text"
              placeholder="Your Name"
              required
              className="px-4 py-3.5 rounded-lg bg-white/5 border border-white/10 text-base text-foreground placeholder-foreground/50 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-colors"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
            />
            <motion.input
              name="email"
              type="email"
              placeholder="Your Email"
              required
              className="px-4 py-3.5 rounded-lg bg-white/5 border border-white/10 text-base text-foreground placeholder-foreground/50 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-colors"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            />
            <motion.textarea
              name="message"
              placeholder="Your Message"
              rows={5}
              required
              className="px-4 py-3.5 rounded-lg bg-white/5 border border-white/10 text-base text-foreground placeholder-foreground/50 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-colors resize-none"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
            />
            <motion.button
              type="submit"
              className="mt-4 flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-accent text-background font-semibold text-base hover:shadow-[0_0_40px_rgba(194,57,179,0.40)] hover:scale-105 transition-all duration-300"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send size={18} />
              Send Message
            </motion.button>
          </form>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        className="mt-24 pt-8 border-t border-white/5 text-center text-sm text-foreground/50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6 }}
      >
        <p>&copy; {new Date().getFullYear()} Iwan Setiawan. Built with <span className="text-accent">❤️</span></p>
      </motion.div>
    </SectionWrapper>
  );
}
