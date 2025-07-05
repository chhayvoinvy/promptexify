"use client";

import { useRef } from "react";
import { motion, useInView, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GridBackground } from "@/components/ui/grid-background";

export function CtaSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const FADE_UP_ANIMATION_VARIANTS: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" } },
  };

  return (
    <section
      ref={ref}
      className="flex justify-center py-12 relative bg-background"
    >
      {/* Grid Background */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none rounded-3xl overflow-hidden">
        <GridBackground className="w-full h-full" gridSize={80} />
        {/* Gradient Overlays for fade effect */}
        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background to-transparent z-50 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background to-transparent z-50 pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background to-transparent z-50 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background to-transparent z-50 pointer-events-none" />
      </div>
      <div className="w-full max-w-5xl rounded-3xl px-8 py-5 md:py-20 lg:py-20 xl:py-20 flex flex-col items-center text-center relative z-10">
        <motion.div
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
          className="flex flex-col items-center"
        >
          <motion.h2
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="text-4xl md:text-6xl font-bold bg-gradient-to-b from-zinc-600 to-zinc-400 bg-clip-text text-transparent mb-6 dark:from-zinc-400 dark:to-zinc-200"
          >
            Get Started Now!
          </motion.h2>
          <motion.p
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="text-lg md:text-2xl text-zinc-500 dark:text-zinc-300 mb-10 max-w-2xl"
          >
            A great prompt changes your results entirely. Start your prompt
            journey today!
          </motion.p>
          <motion.div
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button asChild size="lg" className="font-semibold">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="font-semibold bg-background border-zinc-400 text-zinc-400 hover:bg-background"
            >
              <Link href="/about">Learn more &rarr;</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
