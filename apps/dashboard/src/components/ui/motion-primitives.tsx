"use client"

import type { Transition, Variants } from "motion/react"

export const MOTION_DURATIONS = {
  feedback: 0.16,
  enter: 0.18,
  stagger: 0.05,
} as const

export const EASE_OUT: Transition["ease"] = "easeOut"

export type MotionPreset = "page" | "section" | "item"

export const motionVariants: Record<MotionPreset, Variants> = {
  page: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 6 },
  },
  section: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
  },
  item: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
  },
}

export const motionTransitions = {
  enter: {
    duration: MOTION_DURATIONS.enter,
    ease: EASE_OUT,
  } satisfies Transition,
  feedback: {
    duration: MOTION_DURATIONS.feedback,
    ease: EASE_OUT,
  } satisfies Transition,
} as const
