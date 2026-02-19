"use client";

import { motion, useReducedMotion, type Variants, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

// ─── Animation Variants ───────────────────────────────────────────────────────

const springTransition = { duration: 0.55, ease: [0.22, 1, 0.36, 1] } as const;
const fastTransition    = { duration: 0.35, ease: [0.22, 1, 0.36, 1] } as const;

export const fadeInUpVariants: Variants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0,   transition: springTransition },
};

export const fadeInVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

export const fadeInDownVariants: Variants = {
  hidden:  { opacity: 0, y: -14 },
  visible: { opacity: 1, y: 0,   transition: springTransition },
};

export const scaleInVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1,    transition: springTransition },
};

export const slideInLeftVariants: Variants = {
  hidden:  { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0,  transition: springTransition },
};

export const staggerContainerVariants: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

// ─── Viewport defaults ────────────────────────────────────────────────────────

const defaultViewport = { once: true, margin: "0px" } as const;

// ─── Shared prop interface ────────────────────────────────────────────────────

interface AnimProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

// ─── FadeIn (scroll-triggered, from below) ────────────────────────────────────

export function FadeIn({ children, className, delay = 0 }: AnimProps) {
  const shouldReduce = useReducedMotion();
  
  if (shouldReduce === true) return <div className={className}>{children}</div>;

  return (
    <motion.div
      variants={fadeInUpVariants}
      whileInView="visible"
      viewport={defaultViewport}
      {...(delay ? { transition: { ...springTransition, delay } } : {})}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── FadeInSection (simple fade, no Y movement) ───────────────────────────────

export function FadeInSimple({ children, className, delay = 0 }: AnimProps) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce === true) return <div className={className}>{children}</div>;

  return (
    <motion.div
      variants={fadeInVariants}
      whileInView="visible"
      viewport={defaultViewport}
      {...(delay ? { transition: { duration: 0.45, ease: "easeOut", delay } } : {})}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerContainer ─────────────────────────────────────────────────────────

export function StaggerContainer({ children, className }: { children: ReactNode; className?: string }) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce === true) return <div className={className}>{children}</div>;

  return (
    <motion.div
      variants={staggerContainerVariants}
      whileInView="visible"
      viewport={defaultViewport}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerItem (must be a child of StaggerContainer) ───────────────────────

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <div className={className}>{children}</div>;

  return (
    <motion.div variants={fadeInUpVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ─── HoverLift (wrap a card/element for subtle hover lift) ───────────────────

export function HoverLift({ children, className }: { children: ReactNode; className?: string }) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2, ease: "easeOut" } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── MotionButton (press feedback) ───────────────────────────────────────────

export function MotionButton({
  children,
  className,
  ...props
}: HTMLMotionProps<"div"> & { children: ReactNode; className?: string }) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <div className={className} {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;

  return (
    <motion.div
      whileTap={{ scale: 0.97, transition: fastTransition }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ─── ScaleIn (scale reveal on scroll) ────────────────────────────────────────

export function ScaleIn({ children, className, delay = 0 }: AnimProps) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      variants={scaleInVariants}
      whileInView="visible"
      viewport={defaultViewport}
      {...(delay ? { transition: { ...springTransition, delay } } : {})}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedNumber (count up on mount) ──────────────────────────────────────
// Simple span that just fades in — actual count-up would need JS

export function AnimatedStat({ children, className }: { children: ReactNode; className?: string }) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <span className={className}>{children}</span>;

  return (
    <motion.span
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.span>
  );
}
