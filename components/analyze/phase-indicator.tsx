"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type Phase = "idle" | "analyzing" | "explaining" | "done" | "error";

export function PhaseIndicator({ phase }: { phase: Phase }) {
  if (phase !== "analyzing" && phase !== "explaining") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent border border-primary/20"
    >
      <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
      <div>
        <p className="text-sm font-medium text-primary">
          {phase === "analyzing" ? "Running CPIC Analysis…" : "Generating AI Explanations…"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {phase === "analyzing"
            ? "Deterministic lookup against CPIC tables — no AI involved."
            : "Gemini is explaining the molecular mechanism for each drug."}
        </p>
      </div>
    </motion.div>
  );
}
