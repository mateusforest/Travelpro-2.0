"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type PortalUIContextValue = {
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  toggleMobileMenu: () => void
}

const PortalUIContext = createContext<PortalUIContextValue | null>(null)

export function PortalUIProvider({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  return (
    <PortalUIContext.Provider
      value={{
        mobileMenuOpen,
        setMobileMenuOpen,
        toggleMobileMenu: () => setMobileMenuOpen(!mobileMenuOpen),
      }}
    >
      {children}
    </PortalUIContext.Provider>
  )
}

export function usePortalUI() {
  const ctx = useContext(PortalUIContext)
  if (!ctx) throw new Error("usePortalUI must be used within PortalUIProvider")
  return ctx
}
