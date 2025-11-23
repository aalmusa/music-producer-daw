"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import DotGrid from "@/components/DotGrid"
import { Montserrat } from "next/font/google"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
})

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center relative" style={{ backgroundColor: '#0a0a1a' }}>
      <div className="absolute inset-0 w-full h-full">
        <DotGrid
          dotSize={5}
          gap={10}
          baseColor="#2a1f4d"
          activeColor="#5227FF"
          proximity={150}
          shockRadius={250}
          shockStrength={5}
          resistance={500}
          returnDuration={1.5}
          className="p-0"
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-12 px-4 text-center relative z-10 min-h-screen">
        <h1 className={`${montserrat.className} max-w-3xl text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight`}>
          Create professional music<br />
          with Ai-powered assistance!
        </h1>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/chat">
            <Button size="lg" className="cursor-pointer text-base sm:text-lg px-8 py-6 bg-white text-black hover:bg-white/90 rounded-full font-medium shadow-lg">
              Get Started
            </Button>
          </Link>
          <Button size="lg" className="cursor-pointer text-base sm:text-lg px-8 py-6 bg-transparent border border-white/20 text-white hover:bg-white/10 rounded-full font-medium">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  )
}
