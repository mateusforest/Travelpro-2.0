export type ExpansionIconKey = "headphones" | "shield"

export type ExpansionItem = {
  slug: string
  label: string
  href: string
  description: string
  bg: string
  color: string
  imageSrc?: string
  icon?: ExpansionIconKey
}

export const expansionItems: ExpansionItem[] = [
  {
    slug: "vuei",
    label: "Vuei",
    href: "/app/expansoes/vuei",
    description: "Em breve",
    bg: "#dff7fb",
    color: "#2b7cc2",
    imageSrc: "/expansions/vuei-symbol.png",
  },
  {
    slug: "travelmatch",
    label: "TravelMatch",
    href: "/app/expansoes/travelmatch",
    description: "Em breve",
    bg: "#fff2e8",
    color: "#fe6708",
    imageSrc: "/expansions/travelmatch-symbol.png",
  },
]

export const expansionItemsBySlug = Object.fromEntries(expansionItems.map((item) => [item.slug, item])) as Record<string, ExpansionItem>
