"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import type { SessionPageConfig } from "@/lib/area-configs"

export function SessionEmptyPage({ config }: { config: SessionPageConfig }) {
  const router = useRouter()
  const Icon = config.icon

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: config.bg }}>
          <Icon className="h-7 w-7" style={{ color: config.color }} />
        </div>
        <h1 className="text-xl font-semibold text-[#0a0a0a]">{config.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{config.subtitle}</p>

        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6">
          <p className="text-sm text-gray-600">{config.emptyLabel}</p>
        </div>

        <Link href={config.ctaHref} className="tp-gradient-btn mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition-colors">
          {config.ctaLabel}
        </Link>
      </div>
    </div>
  )
}
