"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"

export type MasterModalType =
  | "cliente"
  | "workspace"
  | "usuario"
  | "assinatura"
  | "chamado"
  | "integracao"
  | null

type MasterContextValue = {
  modal: MasterModalType
  openModal: (m: MasterModalType) => void
  closeModal: () => void
  toast: string | null
  showToast: (msg: string) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (v: boolean) => void
}

const MasterContext = createContext<MasterContextValue | null>(null)

export function MasterProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<MasterModalType>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const openModal = useCallback((m: MasterModalType) => setModal(m), [])
  const closeModal = useCallback(() => setModal(null), [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2800)
  }, [])

  return (
    <MasterContext.Provider
      value={{ modal, openModal, closeModal, toast, showToast, mobileMenuOpen, setMobileMenuOpen }}
    >
      {children}
    </MasterContext.Provider>
  )
}

export function useMaster() {
  const ctx = useContext(MasterContext)
  if (!ctx) throw new Error("useMaster deve ser usado dentro de MasterProvider")
  return ctx
}
