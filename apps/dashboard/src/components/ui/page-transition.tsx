"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { motionTransitions, motionVariants } from "@/components/ui/motion-primitives"

interface PageTransitionProps {
  children: React.ReactNode
  routeKey?: string
  className?: string
}

export function PageTransition({ children, routeKey, className }: PageTransitionProps) {
  const pathname = usePathname()
  const key = routeKey ?? pathname

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={motionVariants.page}
        transition={motionTransitions.enter}
        className={cn("h-full", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
