"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  House,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Headphones,
  Smartphone,
  Monitor,
  MoreVertical,
  Shield,
} from "lucide-react"
import { ProtectedRouteGuard } from "@/components/auth/auth-route-guard"
import { useAuth } from "@/components/auth/auth-provider"
import { ExpansionLaunchItem } from "@/components/expansions/expansion-launch-item"
import { PortalUIProvider, usePortalUI } from "@/components/portal/portal-ui-context"
import { PortalInteractionsProvider, usePortalInteractions } from "@/components/portal/portal-interactions"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Toaster } from "@/components/ui/toaster"
import { expansionItems } from "@/lib/expansion-configs"
import { moduleVisualSections } from "@/lib/module-visual-structure"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRouteGuard>
      <PortalUIProvider>
        <PortalInteractionsProvider>
          <PortalShell>{children}</PortalShell>
          <Toaster />
        </PortalInteractionsProvider>
      </PortalUIProvider>
    </ProtectedRouteGuard>
  )
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    comercial: false,
    documentos: false,
  })
  const { mobileMenuOpen, setMobileMenuOpen } = usePortalUI()
  const { openInstall } = usePortalInteractions()
  const { user, profile } = useAuth()
  const pathname = usePathname()
  const displayName = profile?.full_name || profile?.email || user?.email || "Sua conta"
  const displayRole = profile?.global_role === "master" ? "Master" : "Administrador"
  const initials = displayName.trim().charAt(0).toUpperCase() || "S"

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current }
      let changed = false

      moduleVisualSections.forEach((section) => {
        if (!section.children?.length) {
          return
        }

        const hasActiveChild = section.children.some((child) => child.portalHref === pathname)

        if (hasActiveChild && !next[section.key]) {
          next[section.key] = true
          changed = true
        }
      })

      return changed ? next : current
    })
  }, [pathname])

  return (
    <div className="flex h-screen bg-white">
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        className={`fixed lg:relative h-full bg-[#fafafa] border-r border-gray-100 flex flex-col z-50 transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: sidebarCollapsed ? 72 : 240 }}
      >
        <div className="flex items-center justify-between p-4 h-16">
          <Link href="/portal" className="flex items-center gap-2">
            {sidebarCollapsed ? (
              <Image
                src="/travelpro-logo-mark.png"
                alt="TravelPro"
                width={28}
                height={28}
                priority
                style={{ height: "1.75rem", width: "auto" }}
              />
            ) : (
              <Image
                src="/travelpro-logo-horizontal.png"
                alt="TravelPro"
                width={88}
                height={28}
                priority
                className="w-auto"
                style={{ height: "1.6rem", width: "auto" }}
              />
            )}
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <ul className="space-y-1">
            <li>
              <Link
                href="/portal"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  pathname === "/portal" ? "bg-white shadow-sm text-foreground font-medium" : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                }`}
              >
                <House className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm">Inicio</span>}
              </Link>
            </li>
            {moduleVisualSections.map((section) => {
              const hasChildren = Boolean(section.children?.length)
              const sectionIsActive = Boolean(section.portalHref && pathname === section.portalHref)

              if (!hasChildren) {
                const Icon = section.icon

                if (!Icon || !section.portalHref) {
                  return null
                }

                return (
                  <li key={section.key}>
                    <Link
                      href={section.portalHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        sectionIsActive ? "bg-white shadow-sm text-foreground font-medium" : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!sidebarCollapsed && <span className="text-sm">{section.label}</span>}
                    </Link>
                  </li>
                )
              }

              const SectionIcon = section.icon

              return (
                <li key={section.key} className="space-y-1">
                  <Collapsible
                    open={openGroups[section.key]}
                    onOpenChange={(open) => setOpenGroups((current) => ({ ...current, [section.key]: open }))}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          sectionIsActive ? "bg-white shadow-sm text-foreground font-medium" : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                        }`}
                      >
                        {SectionIcon ? <SectionIcon className="w-5 h-5 flex-shrink-0" /> : null}
                        {!sidebarCollapsed && <span className="flex-1 text-left text-sm">{section.label}</span>}
                        {!sidebarCollapsed && (
                          <ChevronDown
                            className={`h-4 w-4 flex-shrink-0 transition-transform ${openGroups[section.key] ? "rotate-180" : ""}`}
                          />
                        )}
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <ul className={`${sidebarCollapsed ? "space-y-1 pt-1" : "ml-4 border-l border-gray-100 pl-3 pt-1 space-y-1"}`}>
                        {section.children?.map((item) => {
                          const isActive = Boolean(item.portalHref && pathname === item.portalHref)
                          const Icon = item.icon

                          if (item.placeholder) {
                            return (
                              <li key={item.key}>
                                <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-gray-400">
                                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                                    <Icon className="h-4 w-4 text-gray-400" />
                                  </span>
                                  {!sidebarCollapsed && (
                                    <>
                                      <span className="flex-1 text-sm">{item.label}</span>
                                      {item.badgeLabel ? (
                                        <span className="rounded-full border border-dashed border-gray-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                          {item.badgeLabel}
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </li>
                            )
                          }

                          if (!item.portalHref) {
                            return null
                          }

                          return (
                            <li key={item.key}>
                              <Link
                                href={item.portalHref}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all ${
                                  isActive ? "bg-white shadow-sm text-foreground font-medium" : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                                }`}
                              >
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: item.bg }}>
                                  <Icon className="h-4 w-4" style={{ color: item.color }} />
                                </span>
                                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              )
            })}
          </ul>

          {!sidebarCollapsed && (
            <div className="mt-8">
              <div className="flex items-center gap-2 px-3 mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expansões</span>
              </div>
              <ul className="space-y-1">
                {expansionItems.map((item) => (
                  <li key={item.slug}>
                    <ExpansionLaunchItem
                      item={item}
                      href={item.portalHref ?? item.href}
                      onNavigate={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground transition-all"
                    >
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                        {item.imageSrc ? (
                          <span className="relative h-4 w-4 overflow-hidden rounded-sm">
                            <Image src={item.imageSrc} alt={item.label} fill className="object-contain" sizes="16px" />
                          </span>
                        ) : item.icon === "headphones" ? (
                          <Headphones className="h-4 w-4" style={{ color: item.color }} />
                        ) : (
                          <Shield className="h-4 w-4" style={{ color: item.color }} />
                        )}
                      </span>
                      <span className="flex-1 text-sm">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </ExpansionLaunchItem>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={openInstall}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground transition-all ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              {!sidebarCollapsed && <Monitor className="w-4 h-4" />}
            </div>
            {!sidebarCollapsed && <span className="text-sm">Instalar TravelPro</span>}
          </button>

          <div className={`flex items-center gap-3 mt-2 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-all cursor-pointer ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="tp-gradient-chip flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
              {initials}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{displayRole}</p>
              </div>
            )}
            {!sidebarCollapsed && <MoreVertical className="w-4 h-4 text-muted-foreground" />}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            className="hidden lg:flex items-center justify-center w-full mt-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
    </div>
  )
}
