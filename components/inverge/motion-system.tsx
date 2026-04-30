"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MotionSection({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function MotionCard({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <MotionSection className={className} delay={delay}>{children}</MotionSection>;
}

export function MotionButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const reduce = useReducedMotion();
  return <motion.button whileTap={reduce ? undefined : { scale: 0.98 }} whileHover={reduce ? undefined : { y: -1 }} className={className} {...props}>{children}</motion.button>;
}

export function MotionDetails({ summary, children, className, summaryClassName, contentClassName, defaultOpen = false }: { summary: ReactNode; children: ReactNode; className?: string; summaryClassName?: string; contentClassName?: string; defaultOpen?: boolean; }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  return (
    <div className={cn(className)}>
      <button type="button" onClick={() => setIsOpen((prev) => !prev)} className={cn("w-full text-left", summaryClassName)} aria-expanded={isOpen}>
        {summary}
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="content"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={reduce ? undefined : { opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn("overflow-hidden", contentClassName)}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function FirstInputTooltip() {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setShow(true), 600); return () => window.clearTimeout(t); }, []);
  return (
    <AnimatePresence>
      {show ? <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--primary-soft)] px-3 py-2 text-xs text-[color:var(--foreground-strong)]">입력 하나가 오늘 우선순위를 가장 정확하게 만듭니다. <button className="ml-2 underline" onClick={() => setShow(false)}>닫기</button></motion.div> : null}
    </AnimatePresence>
  );
}
