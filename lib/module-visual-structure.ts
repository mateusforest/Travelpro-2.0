import { Briefcase, FileText, FolderOpen, type LucideIcon } from "lucide-react"
import type { TravelProAreaKey } from "@/lib/travelpro-areas"
import { travelProAreasByKey } from "@/lib/travelpro-areas"

export type VisualModuleLeaf = {
  key: string
  label: string
  icon: LucideIcon
  color: string
  bg: string
  appHref?: string
  portalHref?: string
  areaKey?: TravelProAreaKey
  placeholder?: boolean
  badgeLabel?: string
}

export type VisualModuleSection = {
  key: string
  label: string
  icon?: LucideIcon
  color?: string
  bg?: string
  appHref?: string
  portalHref?: string
  areaKey?: TravelProAreaKey
  children?: VisualModuleLeaf[]
}

function areaLeaf(areaKey: TravelProAreaKey): VisualModuleLeaf {
  const area = travelProAreasByKey[areaKey]

  return {
    key: area.key,
    label: area.label,
    icon: area.icon,
    color: area.color,
    bg: area.bg,
    appHref: area.route.app,
    portalHref: area.route.portal,
    areaKey: area.key,
  }
}

function placeholderLeaf(key: string, label: string, icon: LucideIcon): VisualModuleLeaf {
  return {
    key,
    label,
    icon,
    color: "#9ca3af",
    bg: "#f3f4f6",
    placeholder: true,
    badgeLabel: "Em breve",
  }
}

const documentosArea = travelProAreasByKey.documentos

export const moduleVisualSections: VisualModuleSection[] = [
  areaLeaf("clientes"),
  areaLeaf("viagens"),
  {
    key: "comercial",
    label: "Comercial",
    icon: Briefcase,
    color: "#3b82f6",
    bg: "#eff6ff",
    children: [areaLeaf("cotacoes"), areaLeaf("reservas")],
  },
  areaLeaf("financeiro"),
  {
    key: "documentos",
    label: "Documentos",
    icon: documentosArea.icon,
    color: documentosArea.color,
    bg: documentosArea.bg,
    appHref: documentosArea.route.app,
    portalHref: documentosArea.route.portal,
    areaKey: documentosArea.key,
    children: [
      areaLeaf("contratos"),
      placeholderLeaf("arquivos", "Arquivos", FolderOpen),
      areaLeaf("roteiros"),
      areaLeaf("relatorios"),
      placeholderLeaf("recibos", "Recibos", FileText),
      placeholderLeaf("notas-fiscais", "Notas fiscais", FileText),
    ],
  },
  areaLeaf("agenda"),
  areaLeaf("atendimentos"),
  areaLeaf("relatorios"),
  areaLeaf("integracoes"),
  areaLeaf("configuracoes"),
]
