"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import type { ExpansionItem } from "@/lib/expansion-configs"

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
  return (
    <Link href={item.href} onClick={onNavigate} className={className}>
      {children}
    </Link>
  )
}
