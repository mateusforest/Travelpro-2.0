"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Eye } from "lucide-react"

export function VisionSection() {
  return (
    <section id="visao" className="px-4 md:px-8 lg:px-12 py-6 md:py-12">
      {/* Mobile Layout - Compact */}
      <div className="md:hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Section Badge */}
          <div className="inline-flex items-center gap-2 mb-5 py-2 px-3 bg-muted/50 rounded-full">
            <Eye className="h-3.5 w-3.5 text-foreground/60" />
            <span className="text-xs text-foreground/60">Visão</span>
          </div>

          {/* Headline */}
          <h2 className="text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-foreground mb-3">
            O futuro dos negócios
            <br />
            não está nos menus.
          </h2>

          {/* Arrow */}
          <div className="text-blue-600 text-2xl mb-3">
            ↓
          </div>

          {/* Subheadline */}
          <h3 className="text-[1.75rem] leading-[1.15] font-medium tracking-tight text-blue-600 italic mb-4">
            Está nas conversas.
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">
            Estamos construindo uma nova categoria de software operacional.
          </p>

          {/* Logo Mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 flex justify-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-inner">
              <Image
                src="/travelpro-logo-mark.png"
                alt="TravelPro"
                width={48}
                height={48}
                className="w-12 h-12 opacity-30"
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Desktop Layout - Original Image */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden md:block mx-auto max-w-7xl"
      >
        <div className="relative overflow-hidden rounded-3xl">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%202%20de%20jun.%20de%202026%2C%2017_44_54-Ct6osE9LoPGR9a2NY3Bg0vdzQJbUU3.png"
            alt="Visão COS - O futuro dos negócios não está nos menus. Está nas conversas."
            width={1920}
            height={600}
            className="w-full h-auto"
          />
        </div>
      </motion.div>
    </section>
  )
}
