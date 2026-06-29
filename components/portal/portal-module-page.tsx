"use client"

import Link from "next/link"
import { Search, SlidersHorizontal, Plus } from "lucide-react"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"
import { usePortalInteractions } from "@/components/portal/portal-interactions"

export function PortalModulePage({
  title,
  description,
  ctaLabel,
  emptyLabel,
  listHref,
  ctaHref,
  ctaDisabled,
}: {
  title: string
  description: string
  ctaLabel: string
  emptyLabel: string
  listHref: string
  ctaHref?: string
  ctaDisabled?: boolean
}) {
  const { openFilters, openQuickActions } = usePortalInteractions()

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-8">
            <PortalPageHeader title={title} description={description} />
            {ctaHref ? (
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FE6708] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#FE8414]"
              >
                <Plus className="w-4 h-4" />
                {ctaLabel}
              </Link>
            ) : (
              <button
                onClick={openQuickActions}
                disabled={ctaDisabled}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  ctaDisabled
                    ? "cursor-not-allowed bg-gray-100 text-muted-foreground"
                    : "bg-[#FE6708] text-white hover:bg-[#FE8414]"
                }`}
              >
                <Plus className="w-4 h-4" />
                {ctaLabel}
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={`Buscar em ${title.toLowerCase()}...`}
                  className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openFilters}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                  Filtros
                </button>
                <Link
                  href={listHref}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                >
                  Ver todas
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">{emptyLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
