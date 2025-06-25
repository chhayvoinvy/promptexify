import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GridBackground } from "@/components/ui/grid-background";

export function CtaSection() {
  return (
    <section className="flex justify-center py-12 relative">
      {/* Grid Background */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none rounded-3xl overflow-hidden">
        <GridBackground className="w-full h-full" gridSize={80} />
      </div>
      <div className="w-full max-w-5xl rounded-3xl px-8 py-20 flex flex-col items-center text-center relative z-10">
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
          Get Started Now!
        </h2>
        <p className="text-lg md:text-2xl text-gray-300 mb-10 max-w-2xl">
          A great prompt changes your results entirely. Start your prompt
          journey today!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="font-semibold">
            <Link href="/signup">Get started</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="font-semibold bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Link href="/about">Learn more &rarr;</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
