"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

// ─── Shared constants ─────────────────────────────────────────────────────────

const EASE = [0.16, 1, 0.3, 1] as const;
const VIEWPORT = { once: true, margin: "-60px" } as const;

// ─── Variants ─────────────────────────────────────────────────────────────────

export const fadeInUpVariants: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
};

export const staggerContainerVariants: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

export const staggerItemVariants: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

// ─── Shared prop interface ───────────────────────────────────────────────────

interface AnimProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "p" | "span";
}

// ─── FadeInUp — scroll-triggered, slides up from y:24 ────────────────────────

export function FadeInUp({ children, className, delay = 0, as = "div" }: AnimProps) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <div className={className}>{children}</div>;

  const Tag = motion[as];

  return (
    <Tag
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={fadeInUpVariants}
      transition={{ duration: 0.6, ease: EASE, delay }}
      className={className}
    >
      {children}
    </Tag>
  );
}

// ─── FadeIn — scroll-triggered, opacity only ─────────────────────────────────

export function FadeIn({ children, className, delay = 0 }: AnimProps) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={fadeInVariants}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerContainer — orchestrates staggered children ──────────────────────

export function StaggerContainer({
  children,
  className,
  stagger = 0.1,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerItem — child of StaggerContainer ────────────────────────────────

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      variants={staggerItemVariants}
      transition={{ duration: 0.6, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── HoverLift — subtle hover elevation (transform only) ────────────────────

export function HoverLift({
  children,
  className,
  y = -4,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      whileHover={{ y, transition: { duration: 0.25, ease: EASE } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
