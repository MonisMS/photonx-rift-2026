"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FEATURES } from "./data";

export function FeaturesSection() {
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section
      id="features"
      className="relative py-24 md:py-32 bg-noise section-border-top"
      style={{ background: "var(--pg-mid)" }}
    >
      <div className="relative z-[2] mx-auto max-w-5xl px-5">

        {/* Section header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="text-xs font-semibold uppercase tracking-widest text-emerald-300/80 mb-3"
          >
            Clinical Architecture
          </motion.p>
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: "100%", opacity: 0 }}
              whileInView={{ y: "0%", opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1, ease }}
              className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-white"
            >
              Evidence-based infrastructure for pharmacogenomic decision support
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.25, ease }}
            className="mx-auto max-w-xl text-white/65"
          >
            Every component is designed to preserve clinical rigor, ensure auditability,
            and surface actionable pharmacogenomic intelligence at the point of care.
          </motion.p>
        </div>

        {/* Feature cards — single motion.div per card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.08 * i, ease }}
              className={cn(
                "group h-full rounded-xl p-6 cursor-default transition-[background-color,border-color,box-shadow] duration-300",
                feat.featured
                  ? "bg-white/[0.13] border border-emerald-400/20 hover:bg-white/[0.17] hover:shadow-[0_0_0_1px_oklch(0.65_0.14_170/0.30),0_12px_40px_oklch(0.65_0.14_170/0.15)]"
                  : "bg-white/10 border border-white/15 hover:bg-white/[0.14] hover:shadow-[0_0_0_1px_oklch(1_0_0/0.12),0_8px_28px_oklch(0_0_0/0.20)]",
              )}
            >
              <div
                className={cn(
                  "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                  feat.featured
                    ? "bg-emerald-400/15 group-hover:bg-emerald-400/25 group-hover:shadow-[0_0_16px_oklch(0.65_0.14_170/0.20)]"
                    : "bg-white/15 group-hover:bg-white/20",
                )}
              >
                <feat.icon className={cn(
                  "h-5 w-5 transition-all duration-200 group-hover:rotate-2 group-hover:scale-105 group-hover:drop-shadow-[0_0_6px_oklch(0.65_0.14_170/0.4)]",
                  feat.featured
                    ? "text-emerald-400 group-hover:text-emerald-300"
                    : "text-emerald-400/80 group-hover:text-emerald-400",
                )} />
              </div>

              {feat.featured && (
                <span className="inline-block mb-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70 bg-emerald-400/10 rounded-full px-2 py-0.5">
                  Core
                </span>
              )}

              <h3 className="font-semibold mb-2 text-white">{feat.title}</h3>
              <p className="text-sm text-white/65 leading-relaxed">{feat.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
