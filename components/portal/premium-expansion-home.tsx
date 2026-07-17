"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Sparkles } from "lucide-react"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"

type PremiumExpansionHomeProps = {
  title: string
  description: string
  eyebrow: string
  accentColor: string
  accentBg: string
  icon: LucideIcon
  primaryHref?: string
  primaryLabel?: string
  secondaryHref: string
  secondaryLabel: string
  ctas: ReadonlyArray<{
    label: string
    href: string
    description?: string
  }>
  statusCard?: {
    title: string
    badge?: string
    description: string
  }
  placeholderCard?: {
    title: string
    description: string
  }
}

export function PremiumExpansionHome({
  title,
  description,
  eyebrow,
  accentColor,
  accentBg,
  icon: Icon,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  ctas,
  statusCard,
  placeholderCard,
}: PremiumExpansionHomeProps) {
  return (
    <div className="flex flex-1 flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <PortalPageHeader title={title} description={description} />

          <div
            className="mb-8 overflow-hidden rounded-[2rem] border border-gray-100 p-6 shadow-sm lg:p-8"
            style={{
              background: `linear-gradient(135deg, ${accentBg} 0%, #ffffff 58%, #f8fafc 100%)`,
            }}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#0a0a0a] backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" style={{ color: accentColor }} />
                  {eyebrow}
                </div>

                <div className="mb-4 flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-white/80 shadow-sm"
                    style={{ backgroundColor: "#ffffff" }}
                  >
                    <Icon className="h-7 w-7" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-[#0a0a0a] lg:text-3xl">{title}</h2>
                    <p className="mt-1 text-sm text-gray-600 lg:text-base">{description}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {primaryHref && primaryLabel ? (
                    <Link
                      href={primaryHref}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
                    >
                      {primaryLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                  <Link
                    href={secondaryHref}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                  >
                    {secondaryLabel}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ctas.map((cta) => (
              <Link
                key={cta.label}
                href={cta.href}
                className="group rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50"
              >
                <div className="mb-4 inline-flex rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: accentBg, color: accentColor }}>
                  Acao recomendada
                </div>
                <h3 className="text-lg font-semibold text-[#0a0a0a]">{cta.label}</h3>
                <p className="mt-2 text-sm text-gray-500">{cta.description ?? "Abrir conversa contextual para seguir por este caminho no TravelPro."}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium" style={{ color: accentColor }}>
                  Abrir no app
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>

          {statusCard || placeholderCard ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {statusCard ? (
                <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[#0a0a0a]">{statusCard.title}</h3>
                    {statusCard.badge ? (
                      <span
                        className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
                        style={{ backgroundColor: accentBg, color: accentColor }}
                      >
                        {statusCard.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-gray-500">{statusCard.description}</p>
                </div>
              ) : null}

              {placeholderCard ? (
                <div className="rounded-[1.75rem] border border-dashed border-gray-200 bg-white/80 p-5 shadow-sm">
                  <div className="inline-flex rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: accentBg, color: accentColor }}>
                    Placeholder
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#0a0a0a]">{placeholderCard.title}</h3>
                  <p className="mt-3 text-sm text-gray-500">{placeholderCard.description}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
