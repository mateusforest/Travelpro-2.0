"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Box } from "lucide-react"

const companies = [
  { name: "EME", color: "bg-green-600", textColor: "text-white" },
  { name: "Vuei", color: "bg-blue-600", textColor: "text-white" },
  { name: "TravelPro", color: "bg-orange-500", textColor: "text-white" },
  { name: "SR", color: "bg-neutral-900", textColor: "text-white" },
  { name: "Gate", color: "bg-slate-800", textColor: "text-cyan-400" },
  { name: "Curai", color: "bg-emerald-600", textColor: "text-white" },
  { name: "Viagens", color: "bg-rose-900", textColor: "text-rose-400" },
]

export function CompaniesSection() {
  return (
    <section id="empresas" className="px-4 md:px-8 lg:px-12 py-6 md:py-12 overflow-hidden">
      {/* Mobile Layout - Marquee */}
      <div className="md:hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Section Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center">
              <Box className="h-3.5 w-3.5 text-white/80" />
            </div>
            <span className="text-xs text-muted-foreground">Construído com COS</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-1">
            Construído sobre
          </h2>
          <h2 className="text-2xl font-semibold tracking-tight text-white bg-neutral-900 inline-block px-2 py-0.5 rounded mb-6">
            COS.
          </h2>

          <p className="text-sm text-muted-foreground mb-6">
            Empresas e plataformas operando com o modelo COS.
          </p>

          {/* Marquee Container */}
          <div className="relative -mx-4">
            <div className="flex animate-marquee gap-4">
              {[...companies, ...companies].map((company, index) => (
                <div
                  key={`${company.name}-${index}`}
                  className={`flex-shrink-0 w-20 h-20 rounded-2xl ${company.color} flex items-center justify-center shadow-lg`}
                >
                  <span className={`text-sm font-bold ${company.textColor}`}>
                    {company.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Tag */}
          <div className="flex items-center justify-center gap-2 mt-8 py-3 px-4 bg-neutral-100 rounded-full mx-auto w-fit">
            <Box className="h-3.5 w-3.5 text-foreground/60" />
            <span className="text-xs text-foreground/60">
              Diferentes segmentos. Um único sistema.
            </span>
          </div>
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
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%202%20de%20jun.%20de%202026%2C%2015_29_09-BO9DNJqgdBx3JBqFmhbIM99Zo7ijjU.png"
            alt="Construído sobre COS - Empresas e plataformas operando com o modelo COS"
            width={1920}
            height={900}
            className="w-full h-auto"
          />
        </div>
      </motion.div>
    </section>
  )
}
