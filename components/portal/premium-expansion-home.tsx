"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type PremiumDialogConfig = {
  title: string
  eyebrow: string
  description: string
  capabilities: ReadonlyArray<string>
  limitations?: ReadonlyArray<string>
  requirements?: ReadonlyArray<string>
  planLabel: string
  priceLabel: string
  actionLabel: string
  helperText?: string
}

type PremiumAction = {
  label: string
  href?: string
  dialog?: PremiumDialogConfig
  style?: "primary" | "secondary"
  footerLabel?: string
}

type PremiumExpansionHomeProps = {
  title: string
  description: string
  eyebrow: string
  accentColor: string
  accentBg: string
  icon: LucideIcon
  primaryAction?: PremiumAction
  secondaryAction: PremiumAction
  ctas: ReadonlyArray<{
    label: string
    href?: string
    description?: string
    dialog?: PremiumDialogConfig
    footerLabel?: string
    icon?: LucideIcon
  }>
  statusCard?: {
    title: string
    badge?: string
    description: string
    items?: ReadonlyArray<string>
  }
  placeholderCard?: {
    title: string
    description: string
  }
}

function ActionButton({
  action,
  onOpenDialog,
}: {
  action: PremiumAction
  onOpenDialog: (dialog: PremiumDialogConfig) => void
}) {
  const baseClassName =
    action.style === "secondary"
      ? "inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
      : "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"

  if (action.href) {
    return (
      <Link href={action.href} className={baseClassName}>
        {action.label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    )
  }

  if (action.dialog) {
    return (
      <button type="button" onClick={() => onOpenDialog(action.dialog!)} className={baseClassName}>
        {action.label}
        <ArrowRight className="h-4 w-4" />
      </button>
    )
  }

  return null
}

export function PremiumExpansionHome({
  title,
  description,
  eyebrow,
  accentColor,
  accentBg,
  icon: Icon,
  primaryAction,
  secondaryAction,
  ctas,
  statusCard,
  placeholderCard,
}: PremiumExpansionHomeProps) {
  const [activeDialog, setActiveDialog] = useState<PremiumDialogConfig | null>(null)

  const pageActions = useMemo(
    () => [primaryAction, secondaryAction].filter(Boolean) as PremiumAction[],
    [primaryAction, secondaryAction],
  )

  return (
    <div className="flex h-full flex-1 flex-col">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
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
                  {pageActions.map((action) => (
                    <ActionButton key={action.label} action={action} onOpenDialog={setActiveDialog} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ctas.map((cta) => {
              const CardIcon = cta.icon
              const content = (
                <>
                  <div className="mb-4 inline-flex rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: accentBg, color: accentColor }}>
                    Acao recomendada
                  </div>
                  {CardIcon ? (
                    <div
                      className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: accentBg }}
                    >
                      <CardIcon className="h-5 w-5" style={{ color: accentColor }} />
                    </div>
                  ) : null}
                  <h3 className="text-lg font-semibold text-[#0a0a0a]">{cta.label}</h3>
                  <p className="mt-2 text-sm text-gray-500">{cta.description ?? "Abrir conversa contextual para seguir por este caminho no TravelPro."}</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium" style={{ color: accentColor }}>
                    {cta.footerLabel ?? (cta.href ? "Abrir no app" : "Abrir detalhes")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </>
              )

              if (cta.href) {
                return (
                  <Link
                    key={cta.label}
                    href={cta.href}
                    className="group rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    {content}
                  </Link>
                )
              }

              return (
                <button
                  key={cta.label}
                  type="button"
                  onClick={() => cta.dialog && setActiveDialog(cta.dialog)}
                  className="group rounded-[1.75rem] border border-gray-100 bg-white p-5 text-left shadow-sm transition-colors hover:bg-gray-50"
                >
                  {content}
                </button>
              )
            })}
          </div>

          {statusCard || placeholderCard ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {statusCard ? (
                <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[#0a0a0a]">{statusCard.title}</h3>
                    {statusCard.badge ? (
                      <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: accentBg, color: accentColor }}>
                        {statusCard.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-gray-500">{statusCard.description}</p>
                  {statusCard.items?.length ? (
                    <div className="mt-4 space-y-2">
                      {statusCard.items.map((item) => (
                        <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: accentColor }} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
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

      <Dialog open={Boolean(activeDialog)} onOpenChange={(open) => !open && setActiveDialog(null)}>
        {activeDialog ? (
          <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[1.75rem] border-gray-100 p-0 sm:max-w-2xl">
            <div
              className="border-b border-gray-100 px-6 py-5"
              style={{ background: `linear-gradient(135deg, ${accentBg} 0%, #ffffff 60%, #f8fafc 100%)` }}
            >
              <DialogHeader className="text-left">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#0a0a0a]">
                  <Sparkles className="h-3.5 w-3.5" style={{ color: accentColor }} />
                  {activeDialog.eyebrow}
                </div>
                <DialogTitle className="text-2xl text-[#0a0a0a]">{activeDialog.title}</DialogTitle>
                <DialogDescription className="text-sm leading-6 text-gray-600">{activeDialog.description}</DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-5 px-6 py-5 lg:grid-cols-[1.25fr_0.9fr]">
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">O que faz</h3>
                  <div className="mt-3 space-y-2">
                    {activeDialog.capabilities.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: accentColor }} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {activeDialog.limitations?.length ? (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Limitacoes atuais</h3>
                    <div className="mt-3 space-y-2">
                      {activeDialog.limitations.map((item) => (
                        <div key={item} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeDialog.requirements?.length ? (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Requisitos</h3>
                    <div className="mt-3 space-y-2">
                      {activeDialog.requirements.map((item) => (
                        <div key={item} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5">
                <div className="inline-flex rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: accentBg, color: accentColor }}>
                  Plano placeholder
                </div>
                <h3 className="mt-4 text-xl font-semibold text-[#0a0a0a]">{activeDialog.planLabel}</h3>
                <p className="mt-2 text-3xl font-semibold text-[#0a0a0a]">{activeDialog.priceLabel}</p>
                <p className="mt-2 text-sm text-gray-500">Valor e condicoes ainda em estado visual. Nenhum pagamento sera processado aqui.</p>
                <button
                  type="button"
                  onClick={() => setActiveDialog(null)}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
                >
                  {activeDialog.actionLabel}
                </button>
                {activeDialog.helperText ? <p className="mt-3 text-xs text-gray-500">{activeDialog.helperText}</p> : null}
              </div>
            </div>

            <DialogFooter className="border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Fechar
              </button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
