"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { CheckCircle2, ArrowRight, BarChart3, Sparkles } from "lucide-react"

const product = {
  id: "operacoes",
  number: "01",
  name: "Operacoes",
  icon: BarChart3,
  accent: "text-green-600",
  iconColor: "text-green-600",
  iconBg: "bg-green-50",
  check: "text-green-600",
  description: "Gerencie seu negocio por conversa.",
  features: [
    "Clientes e oportunidades",
    "Financeiro e cobrancas",
    "Documentos e contratos",
    "Tarefas e projetos",
    "Reunioes e equipe",
  ],
  href: "/produtos/operacoes",
}

export function ProductsSection() {
  return (
    <section id="produtos" className="px-4 py-12 md:px-8 md:py-20 lg:px-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-5xl"
      >
        <div className="mb-10 flex flex-col items-center text-center md:mb-14">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2">
            <Sparkles className="h-3.5 w-3.5 text-foreground/60" />
            <span className="text-xs text-foreground/70 md:text-sm">Sistema operacional conversacional</span>
          </div>

          <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            Conheca o <span className="text-foreground/70">TravelPro.</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-lg">
            Um produto para operar sua agencia por conversa.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6">
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col rounded-3xl border border-border/50 bg-white p-6 shadow-sm md:p-8"
          >
            <div className="mb-6 flex items-start justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${product.iconBg}`}>
                <product.icon className={`h-6 w-6 ${product.iconColor}`} />
              </div>
              <span className={`text-sm font-medium ${product.accent}`}>{product.number}</span>
            </div>

            <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
              TravelPro <span className={product.accent}>{product.name}</span>
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground md:text-base">{product.description}</p>

            <div className="my-6 h-px bg-border/60" />

            <ul className="flex-1 space-y-3">
              {product.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${product.check}`} />
                  <span className="text-sm text-foreground/80">{feature}</span>
                </li>
              ))}
            </ul>

            <Link href={product.href} className="group mt-8 inline-flex items-center gap-3 text-sm font-medium text-foreground">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-foreground group-hover:text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
              Saiba mais
            </Link>
          </motion.div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 md:mt-14">
          <Sparkles className="h-3.5 w-3.5 text-foreground/50" />
          <span className="text-center text-xs text-muted-foreground text-pretty md:text-sm">
            TravelPro para centralizar operacoes, equipe e clientes.
          </span>
        </div>
      </motion.div>
    </section>
  )
}
