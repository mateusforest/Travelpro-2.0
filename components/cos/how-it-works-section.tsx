"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { MessageCircle, Brain, Zap, ClipboardList, CheckCircle2 } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: MessageCircle,
    title: "Você pede.",
    description: "Em linguagem natural, como você já fala."
  },
  {
    number: "02",
    icon: Brain,
    title: "COS entende.",
    description: "A IA interpreta o contexto e o que precisa ser feito."
  },
  {
    number: "03",
    icon: Zap,
    title: "COS executa.",
    description: "Ação tomada automaticamente nos sistemas certos."
  },
  {
    number: "04",
    icon: ClipboardList,
    title: "COS organiza.",
    description: "Tudo é estruturado, registrado e sincronizado."
  },
  {
    number: "05",
    icon: CheckCircle2,
    title: "Resultado.",
    description: "Informação certa, na hora certa, para a pessoa certa."
  },
]

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft
      const cardWidth = scrollRef.current.offsetWidth * 0.75
      const newStep = Math.round(scrollLeft / cardWidth)
      setActiveStep(Math.min(newStep, steps.length - 1))
    }
  }

  return (
    <section id="como-funciona" className="px-4 md:px-8 lg:px-12 py-6 md:py-12">
      {/* Mobile Layout - Horizontal Carousel */}
      <div className="md:hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Section Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-foreground/60" />
            </div>
            <span className="text-xs text-muted-foreground">Como funciona</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-1">
            Simples como
          </h2>
          <h2 className="text-2xl font-semibold tracking-tight text-blue-600 mb-6">
            conversar.
          </h2>

          {/* Horizontal Scroll Cards */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex-shrink-0 w-[75vw] max-w-[280px] snap-center"
              >
                <div className="bg-white rounded-2xl p-5 h-full border border-border/50 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <step.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-blue-600">{step.number}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-1.5 mt-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === activeStep ? "w-6 bg-foreground" : "w-1.5 bg-foreground/20"
                }`}
              />
            ))}
          </div>

          {/* Bottom Tag */}
          <div className="flex items-center justify-center gap-2 mt-6 py-3 px-4 bg-muted/50 rounded-full mx-auto w-fit">
            <Zap className="h-3.5 w-3.5 text-foreground/60" />
            <span className="text-xs text-foreground/60">Menos cliques. Mais resultado.</span>
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
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%202%20de%20jun.%20de%202026%2C%2015_28_30-wSum11McoCQksrbzqqvhNqmT6JtGeP.png"
            alt="Como funciona o COS - Simples como conversar"
            width={1920}
            height={900}
            className="w-full h-auto"
          />
        </div>
      </motion.div>
    </section>
  )
}
