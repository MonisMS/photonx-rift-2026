"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FAQS } from "./data";

function FAQItem({ faq, index }: { faq: typeof FAQS[number]; index: number }) {
  const [open, setOpen] = useState(false);
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: 0.06 * index, ease }}
    >
      <div
        className="rounded-xl border border-border/60 bg-white px-5 shadow-card transition-all duration-300 data-[open=true]:shadow-card-md data-[open=true]:border-primary/15"
        data-open={open}
      >
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between py-4 text-left"
        >
          <span className="text-sm font-semibold text-foreground pr-4">{faq.q}</span>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.3, ease }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted"
          >
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: { duration: 0.3, ease }, opacity: { duration: 0.25, delay: 0.05 } }}
              className="overflow-hidden"
            >
              <p className="text-sm text-muted-foreground leading-relaxed pb-5">
                {faq.a}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function FAQSection() {
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section
      id="faq"
      className="relative py-24 md:py-32 bg-noise section-border-top section-border-top-light"
      style={{ background: "var(--pg-near-white)" }}
    >
      <div className="relative z-[2] mx-auto max-w-3xl px-5">
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="eyebrow mb-3"
          >
            Technical FAQ
          </motion.p>
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: "100%", opacity: 0 }}
              whileInView={{ y: "0%", opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1, ease }}
              className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-foreground"
            >
              Frequently asked questions
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.25, ease }}
            className="text-foreground/60"
          >
            Technical and clinical context for pharmacogenomic analysis with PharmaGuard.
          </motion.p>
        </div>

        <div className="space-y-2.5">
          {FAQS.map((faq, i) => (
            <FAQItem key={i} faq={faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
