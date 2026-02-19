"use client";

import { motion } from "framer-motion";
import { Lock, CheckCircle2 } from "lucide-react";

const PRINCIPLES = [
  "Deterministic CPIC table logic — no ML in risk classification",
  "VCF parsed in-browser — genomic data never transmitted",
  "No patient data retained beyond session",
  "AI narrates clinical mechanisms — never determines risk labels",
  "Fully auditable decision pathway from variant to recommendation",
  "Open, reproducible science foundation",
];

export function SecuritySection() {
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section id="security" className="relative py-24 md:py-32 bg-noise section-border-top" style={{ background: "var(--pg-light)" }}>
      <div className="relative z-[2] mx-auto max-w-5xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease }}
          className="rounded-2xl border border-black/10 bg-white/40 backdrop-blur-sm overflow-hidden shadow-lg"
        >
          <div className="grid md:grid-cols-2 gap-0 relative">

            {/* Animated divider */}
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.4, ease }}
              className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px origin-top"
              style={{ background: "linear-gradient(to bottom, transparent, oklch(0.42 0.14 170 / 0.35), transparent)" }}
            />

            {/* Text column */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.15, ease }}
              className="p-8 md:p-12"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: 0.25, ease }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/15 mb-6"
              >
                <Lock className="h-6 w-6 text-emerald-700" />
              </motion.div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 mb-3">Transparency &amp; Data Sovereignty</p>
              <h2 className="text-3xl font-bold tracking-tight mb-5 text-gray-900">
                Auditable architecture.<br className="hidden sm:block" /> Zero genomic data exposure.
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6 text-base">
                Genomic data is among the most sensitive clinical information in existence.
                PharmaGuard is architected so that raw variant data never leaves the
                clinician&apos;s browser — and risk classification is deterministic, not probabilistic.
                Every output can be traced from variant to diplotype to phenotype to recommendation.
              </p>
              <p className="text-sm text-gray-500 border-t border-black/10 pt-4">
                PharmaGuard is built for research and clinical decision support. It is not
                a regulated medical device. Always confirm reports with a qualified clinician.
              </p>
            </motion.div>

            {/* Principles column */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.3, ease }}
              className="bg-black/[0.03] p-8 md:p-12 border-t md:border-t-0 border-black/10"
            >
              <p className="text-base font-bold mb-7 text-gray-900">Core privacy principles</p>
              <ul className="space-y-5">
                {PRINCIPLES.map((p, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45, delay: 0.4 + i * 0.09, ease }}
                    className="flex items-start gap-3.5"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.45 + i * 0.09 }}
                      className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/15"
                    >
                      <CheckCircle2 className="h-[18px] w-[18px] text-emerald-700" />
                    </motion.div>
                    <span className="text-[15px] text-gray-700 font-medium leading-snug">{p}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
