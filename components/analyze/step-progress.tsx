"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  complete: boolean;
}

export function StepProgress({ steps }: { steps: Step[] }) {
  const shouldReduce = useReducedMotion();
  const activeIndex = steps.findIndex((s) => !s.complete);

  return (
    <div className="flex items-center justify-center py-5 px-6 md:px-8">
      {steps.map((step, i) => {
        const isComplete = step.complete;
        const isActive = i === activeIndex;
        const isUpcoming = !isComplete && !isActive;

        return (
          <div key={step.label} className="flex items-center">
            {/* Node + label */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={
                  isComplete && !shouldReduce
                    ? { scale: [1.15, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300",
                  isComplete && "bg-emerald-500",
                  isActive && "bg-primary ring-2 ring-primary/20",
                  isUpcoming && "bg-muted border border-border",
                )}
              >
                {isComplete ? (
                  <motion.div
                    initial={shouldReduce ? false : { opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <Check className="h-4 w-4 text-white" strokeWidth={3} />
                  </motion.div>
                ) : (
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isActive ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
              </motion.div>

              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap transition-colors duration-300",
                  isComplete && "text-emerald-600",
                  isActive && "text-foreground font-semibold",
                  isUpcoming && "text-muted-foreground/60",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting line */}
            {i < steps.length - 1 && (
              <div className="relative mx-3 h-0.5 w-12 sm:w-16 rounded-full bg-border overflow-hidden self-start mt-4">
                <motion.div
                  initial={false}
                  animate={{ scaleX: isComplete ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute inset-0 origin-left rounded-full bg-emerald-500"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
