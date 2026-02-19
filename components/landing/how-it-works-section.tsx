"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { STEPS } from "./data";

export function HowItWorksSection() {
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section id="how-it-works" className="relative py-24 md:py-32 bg-noise section-border-top" style={{ background: "var(--pg-deep)" }}>
      <div className="relative z-[2] mx-auto max-w-5xl px-5">

        {/* Section header */}
        <div className="text-center mb-16 md:mb-20">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80 mb-3"
          >
            Methodology
          </motion.p>
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: "100%", opacity: 0 }}
              whileInView={{ y: "0%", opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1, ease }}
              className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-white"
            >
              From VCF variant file to clinical risk report<br className="hidden sm:block" /> in three deterministic steps
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.25, ease }}
            className="mx-auto max-w-xl text-white/60"
          >
            No account required. No data uploaded. Fully reproducible results.
          </motion.p>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.12, ease }}
              className="group relative flex flex-col items-center text-center p-6 rounded-2xl bg-white/10 border border-white/15 transition-[background-color,border-color,box-shadow] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.13] hover:border-white/20 hover:shadow-[0_0_0_1px_oklch(0.65_0.14_170/0.20),0_8px_28px_oklch(0.65_0.14_170/0.10)]"
            >
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[calc(50%+48px)] right-[-24px] h-px bg-gradient-to-r from-white/20 to-transparent" />
              )}
              <div className="relative mb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 border border-white/15 transition-[background-color,border-color,box-shadow] duration-250 group-hover:bg-white/20 group-hover:border-emerald-400/30 group-hover:shadow-[0_0_20px_oklch(0.65_0.14_170/0.15)]">
                  <step.icon className="h-9 w-9 text-emerald-400 transition-transform duration-250 group-hover:scale-105" />
                </div>
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold text-emerald-950 shadow-sm">
                  {i + 1}
                </span>
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80 mb-2">{step.step}</div>
              <h3 className="text-lg font-semibold mb-3 text-white">{step.title}</h3>
              <p className="text-sm text-white/65 leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="mt-14 text-center"
        >
          <Link
            href="/analyze"
            className="group relative inline-flex items-center gap-2 rounded-full px-8 h-12 text-base font-semibold bg-white overflow-hidden transition-all duration-250 hover:scale-[1.03] hover:shadow-[0_4px_24px_oklch(0.65_0.14_170/0.25)] shadow-card-lg"
            style={{ color: "var(--pg-hero)" }}
          >
            <span
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-250"
              style={{ background: "linear-gradient(90deg, oklch(0.97 0.01 184.5) 0%, oklch(1 0 0) 50%, oklch(0.97 0.01 184.5) 100%)" }}
            />
            <span className="relative flex items-center gap-2">
              Launch Clinical Analysis
              <ArrowRight className="h-4 w-4 transition-transform duration-250 group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
