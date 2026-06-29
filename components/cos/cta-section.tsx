"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Zap, Lock, BarChart3, CreditCard } from "lucide-react"

export function CTASection() {
  return (
    <section id="cta" className="px-4 md:px-8 lg:px-12 py-6 md:py-12">
      {/* Mobile Layout - Clean & Impactful */}
      <div className="md:hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center bg-gradient-to-b from-[#f8f8f6] to-[#f0f0ee] rounded-3xl py-10 px-6"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-6 py-2 px-4 bg-white/80 rounded-full shadow-sm">
            <Zap className="h-3.5 w-3.5 text-foreground/60" />
            <span className="text-xs text-foreground/60">Pronto para transformar sua operação?</span>
          </div>

          {/* Headline */}
          <h2 className="text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-foreground mb-2">
            Menos ferramentas.
          </h2>
          <h2 className="text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-muted-foreground mb-4">
            Mais resultado.
          </h2>

          {/* Subheadline */}
          <p className="text-sm text-muted-foreground mb-6 max-w-[280px] mx-auto">
            O COS unifica comunicação, processos e pessoas em um só sistema operacional.
          </p>

          {/* Primary CTA */}
          <Link
            href="/cadastro"
            className="inline-flex items-center justify-center gap-2 bg-foreground text-white rounded-full py-3.5 px-8 font-medium mb-6 w-full max-w-[280px]"
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png"
              alt="COS"
              width={20}
              height={20}
              className="w-5 h-5 invert"
            />
            Começar agora
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Benefits Row */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium">Implantação rápida</p>
                <p className="text-[10px] text-muted-foreground">Comece em minutos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Lock className="h-4 w-4 text-foreground/70" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium">Segurança de ponta</p>
                <p className="text-[10px] text-muted-foreground">Dados protegidos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                <BarChart3 className="h-4 w-4 text-foreground/70" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium">Escalável</p>
                <p className="text-[10px] text-muted-foreground">Do pequeno ao grande</p>
              </div>
            </div>
          </div>

          {/* Bottom Note */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Sem cartão de crédito. Sem burocracia.</span>
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#f0f0ee] to-[#e8e8e6]">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%202%20de%20jun.%20de%202026%2C%2017_47_50-64zLJmALKvNSb4dIhwIB6uvdp6uC5u.png"
            alt="Menos ferramentas. Mais resultado."
            width={1920}
            height={900}
            className="w-full h-auto"
          />
          <Link
            href="/cadastro"
            className="absolute left-1/2 top-[52%] -translate-x-1/2 w-[25%] max-w-xs h-[10%] opacity-0 hover:opacity-10 hover:bg-foreground/10 rounded-full transition-opacity cursor-pointer"
            aria-label="Começar agora"
          />
        </div>
      </motion.div>
    </section>
  )
}
