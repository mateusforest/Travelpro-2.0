"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight, Play, ShoppingBag, Briefcase, Factory, Heart, GraduationCap, Building2, Plane, Truck, MoreHorizontal } from "lucide-react"

const sectors = [
  { icon: ShoppingBag, label: "Comércio" },
  { icon: Briefcase, label: "Serviços" },
  { icon: Factory, label: "Indústria" },
  { icon: Heart, label: "Saúde" },
  { icon: GraduationCap, label: "Educação" },
  { icon: Building2, label: "Imobiliário" },
  { icon: Plane, label: "Turismo" },
  { icon: Truck, label: "Logística" },
  { icon: MoreHorizontal, label: "E muito mais" },
]

export function HeroSection() {
  const pathname = usePathname()
  const router = useRouter()

  const scrollToProducts = () => {
    if (pathname !== "/") {
      router.push("/#produtos")
      return
    }

    const element = document.querySelector("#produtos")
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section className="pt-20 md:pt-32 px-4 md:px-8 lg:px-12">
      {/* Mobile Layout - Text First */}
      <div className="md:hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-6"
        >
          {/* Mobile Headline */}
          <h1 className="text-[2rem] leading-[1.1] font-medium tracking-tight text-foreground mb-3">
            <span className="italic">Sua empresa</span>
            <br />
            <span className="italic">conversa.</span>
            <br />
            <span className="font-semibold not-italic">TravelPro executa.</span>
          </h1>
          
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-6 max-w-[280px] mx-auto">
            Uma nova forma de operar negócios, criar softwares e conectar sistemas.
          </p>

          {/* Mobile CTAs */}
          <div className="flex flex-col gap-3 items-center">
            <Link
              href="/cadastro"
              className="tp-gradient-btn inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
            >
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button onClick={scrollToProducts} className="inline-flex items-center gap-2 text-sm text-foreground/70 py-2">
              <Play className="h-4 w-4" />
              Conhecer o TravelPro
            </button>
          </div>
        </motion.div>

        {/* Mobile Hero Banner - Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="relative -mx-4"
        >
          <div className="relative overflow-hidden rounded-t-3xl">
            <Image
              src="/cos-hero-banner.png"
              alt="COS - Sua empresa conversa. O COS executa."
              width={1717}
              height={916}
              className="w-full h-auto object-cover"
              priority
            />
          </div>
        </motion.div>

        {/* Mobile Sectors - Horizontal Scroll */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-b-2xl -mx-4 px-4 py-4 shadow-sm"
        >
          <p className="text-xs text-muted-foreground mb-3">O TravelPro atende os principais setores.</p>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {sectors.map((sector, index) => (
              <div
                key={sector.label}
                className="flex flex-col items-center gap-1.5 min-w-[60px]"
              >
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                  <sector.icon className="h-5 w-5 text-foreground/70" />
                </div>
                <span className="text-[10px] text-foreground/60 whitespace-nowrap">{sector.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Desktop Layout - Original */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden md:block mx-auto max-w-7xl"
      >
        <div className="relative overflow-hidden rounded-3xl">
          <Image
            src="/cos-hero-banner.png"
            alt="COS - Sua empresa conversa. O COS executa."
            width={1717}
            height={916}
            className="w-full h-auto"
            priority
          />
        </div>
      </motion.div>
    </section>
  )
}
