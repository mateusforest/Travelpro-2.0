"use client"

import type React from "react"
import { motion } from "framer-motion"
import { ChevronRight, type LucideIcon } from "lucide-react"

/** Cabeçalho de página padrão do Master. */
export function MasterPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1 text-balance">{title}</h1>
        <p className="text-muted-foreground text-pretty">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}

/** Cartão de KPI minimalista. */
export function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  delay = 0,
}: {
  label: string
  value: string
  sublabel?: string
  icon: LucideIcon
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-2xl font-semibold mb-1">{value}</p>
      {sublabel && <p className="text-sm text-muted-foreground">{sublabel}</p>}
    </motion.div>
  )
}

/** Badge de status reutilizável. */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Ativo: "bg-emerald-50 text-emerald-600",
    Ativa: "bg-emerald-50 text-emerald-600",
    Conectado: "bg-emerald-50 text-emerald-600",
    Trial: "bg-blue-50 text-blue-600",
    "Em preparação": "bg-amber-50 text-amber-600",
    Preparando: "bg-amber-50 text-amber-600",
    Pendente: "bg-amber-50 text-amber-600",
    Aberto: "bg-amber-50 text-amber-600",
    "Em andamento": "bg-blue-50 text-blue-600",
    Cancelada: "bg-gray-100 text-gray-500",
    Cancelado: "bg-gray-100 text-gray-500",
    Inativo: "bg-gray-100 text-gray-500",
    Desconectado: "bg-red-50 text-red-500",
    Resolvido: "bg-emerald-50 text-emerald-600",
    Fechado: "bg-gray-100 text-gray-500",
    Alta: "bg-red-50 text-red-500",
    Média: "bg-amber-50 text-amber-600",
    Baixa: "bg-gray-100 text-gray-500",
  }
  return (
    <span className={`inline-flex items-center text-xs font-medium rounded-full px-2.5 py-0.5 ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  )
}

/** Container de tabela responsivo com rolagem horizontal no mobile. */
export function TableCard({
  children,
  title,
  toolbar,
  delay = 0.1,
}: {
  children: React.ReactNode
  title?: string
  toolbar?: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
    >
      {(title || toolbar) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
          {title && <h2 className="font-semibold">{title}</h2>}
          {toolbar && <div className="flex items-center gap-2 flex-wrap">{toolbar}</div>}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </motion.div>
  )
}

/** Estado vazio honesto. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1 text-balance">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed text-pretty">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Aviso honesto de funcionalidade dependente de backend. */
export function BackendNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
      <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
      <p className="text-sm text-muted-foreground leading-relaxed">
        {children ?? "Esta configuração será habilitada após a integração do backend."}
      </p>
    </div>
  )
}

/** Botão primário padrão. */
export function PrimaryButton({
  children,
  onClick,
  icon: Icon,
}: {
  children: React.ReactNode
  onClick?: () => void
  icon?: LucideIcon
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  )
}

/** Botão secundário padrão. */
export function SecondaryButton({
  children,
  onClick,
  icon: Icon,
}: {
  children: React.ReactNode
  onClick?: () => void
  icon?: LucideIcon
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
    >
      {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      {children}
    </button>
  )
}

/** Linha de item de lista clicável (para drill-down futuro). */
export function ListRow({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-5 py-3.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
    >
      {children}
      <ChevronRight className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" />
    </button>
  )
}
