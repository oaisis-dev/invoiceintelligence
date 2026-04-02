"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"
import {
  MOTION_DURATIONS,
  motionTransitions,
  motionVariants,
} from "@/components/ui/motion-primitives"

interface SectionRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function SectionReveal({ children, className, delay = 0 }: SectionRevealProps) {
  const shouldReduce = useReducedMotion()

  if (shouldReduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.section
      initial="initial"
      animate="animate"
      variants={motionVariants.section}
      transition={{
        ...motionTransitions.enter,
        delay: Math.max(0, Math.min(delay, MOTION_DURATIONS.stagger * 8)),
      }}
      className={cn(className)}
    >
      {children}
    </motion.section>
  )
}
