"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ExpansionShowcaseModal } from "@/components/modals/expansion-showcase-modal"
import type { ExpansionItem } from "@/lib/expansion-configs"

function shouldOpenModal(slug: string) {
  return slug === "advisor" || slug === "agent"
}

export function ExpansionLaunchItem({
  item,
  className,
  children,
  onNavigate,
}: {
  item: ExpansionItem
  className: string
  children: ReactNode
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)

  if (!shouldOpenModal(item.slug)) {
    return (
      <Link href={item.href} onClick={onNavigate} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onNavigate?.()
          setOpen(true)
        }}
        className={className}
      >
        {children}
      </button>
      <ExpansionShowcaseModal item={item} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
