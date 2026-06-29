"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { CheckCircle2, ArrowRight, BarChart3, Link2, Sparkles } from "lucide-react"

type ProductId = "operacoes" | "connect"

const products = [
  {
    id: "operacoes" as ProductId,
    number: "01",
    name: "Operações",
    icon: BarChart3,
    accent: "text-green-600",
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
    check: "text-green-600",
    description: "Gerencie seu negócio por conversa.",
    features: [
      "Clientes e oportunidades",
      "Financeiro e cobranças",
      "Documentos e contratos",
      "Tarefas e projetos",
      "Reuniões e equipe",
    ],
    href: "/produtos/operacoes",
  },
  {
    id: "connect" as ProductId,
    number: "02",
    name: "Connect",
    icon: Link2,
    accent: "text-violet-600",
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    check: "text-violet-600",
    description: "Utilize o COS sobre sistemas existentes.",
    features: [
      "Conecte seus sistemas",
      "Sem migração",
      "APIs e integrações nativas",
      "Dados sincronizados",
      "Tudo em tempo real",
    ],
    href: "/produtos/connect",
  },
]

export function ProductsSection() {
  return (
    <section id="produtos" className="px-4 md:px-8 lg:px-12 py-12 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-5xl"
      >
        <div className="flex flex-col items-center text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-foreground/60" />
            <span className="text-xs md:text-sm text-foreground/70">Duas formas de utilizar</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-balance">
            Escolha como utilizar o <span className="text-foreground/70">COS.</span>
          </h2>
          <p className="mt-3 text-sm md:text-lg text-muted-foreground">
            Uma plataforma. Duas formas de operar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-3xl border border-border/50 shadow-sm p-6 md:p-8 flex flex-col"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-12 h-12 rounded-2xl ${product.iconBg} flex items-center justify-center`}>
                  <product.icon className={`h-6 w-6 ${product.iconColor}`} />
                </div>
                <span className={`text-sm font-medium ${product.accent}`}>{product.number}</span>
              </div>

              <h3 className="text-xl md:text-2xl font-semibold tracking-tight">
                COS <span className={product.accent}>{product.name}</span>
              </h3>
              <p className="mt-1.5 text-sm md:text-base text-muted-foreground">
                {product.description}
              </p>

              <div className="my-6 h-px bg-border/60" />

              <ul className="space-y-3 flex-1">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${product.check}`} />
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={product.href} className="mt-8 inline-flex items-center gap-3 text-sm font-medium text-foreground group">
                <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center transition-colors group-hover:bg-foreground group-hover:text-white">
                  <ArrowRight className="h-4 w-4" />
                </span>
                Saiba mais
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-10 md:mt-14">
          <Sparkles className="h-3.5 w-3.5 text-foreground/50" />
          <span className="text-xs md:text-sm text-muted-foreground text-center text-pretty">
            Dois produtos. Um único sistema operacional conversacional.
          </span>
        </div>
      </motion.div>
    </section>
  )
}
