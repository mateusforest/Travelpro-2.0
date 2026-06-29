"use client"

import type React from "react"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, type LucideIcon, Building2, Boxes, UserPlus, CreditCard, LifeBuoy, Plug } from "lucide-react"
import { useMaster, type MasterModalType } from "./master-store"

type FieldDef = { name: string; label: string; placeholder?: string; type?: "text" | "email" | "select"; options?: string[] }

const modalConfig: Record<
  Exclude<MasterModalType, null>,
  { title: string; icon: LucideIcon; fields: FieldDef[]; submit: string; toast: string }
> = {
  cliente: {
    title: "Novo cliente",
    icon: Building2,
    submit: "Criar cliente",
    toast: "Cliente registrado. Sincronização disponível após o backend.",
    fields: [
      { name: "empresa", label: "Empresa", placeholder: "Nome da empresa" },
      { name: "tipo", label: "Produto", type: "select", options: ["Operações"] },
      { name: "plano", label: "Plano", type: "select", options: ["Starter", "Pro", "Business", "Enterprise"] },
      { name: "email", label: "E-mail de contato", type: "email", placeholder: "contato@empresa.com" },
    ],
  },
  workspace: {
    title: "Novo workspace",
    icon: Boxes,
    submit: "Criar workspace",
    toast: "Workspace criado. Provisionamento disponível após o backend.",
    fields: [
      { name: "nome", label: "Nome do workspace", placeholder: "Nome do workspace" },
      { name: "tipo", label: "Tipo", type: "select", options: ["Operações"] },
      { name: "plano", label: "Plano", type: "select", options: ["Starter", "Pro", "Business", "Enterprise"] },
    ],
  },
  usuario: {
    title: "Novo usuário",
    icon: UserPlus,
    submit: "Criar usuário",
    toast: "Usuário registrado. Convite será enviado após o backend.",
    fields: [
      { name: "nome", label: "Nome completo", placeholder: "Nome completo" },
      { name: "email", label: "E-mail", type: "email", placeholder: "maria@empresa.com" },
      { name: "workspace", label: "Workspace", placeholder: "Nome da empresa" },
      { name: "tipo", label: "Papel", type: "select", options: ["Administrador", "Membro", "Suporte"] },
    ],
  },
  assinatura: {
    title: "Nova assinatura",
    icon: CreditCard,
    submit: "Criar assinatura",
    toast: "Assinatura registrada. Cobrança ativada após integração Stripe.",
    fields: [
      { name: "empresa", label: "Empresa", placeholder: "Nome da empresa" },
      { name: "plano", label: "Plano", type: "select", options: ["Starter", "Pro", "Business", "Enterprise"] },
      { name: "status", label: "Status", type: "select", options: ["Ativa", "Trial"] },
    ],
  },
  chamado: {
    title: "Novo chamado",
    icon: LifeBuoy,
    submit: "Abrir chamado",
    toast: "Chamado aberto. Integração de suporte disponível após o backend.",
    fields: [
      { name: "assunto", label: "Assunto", placeholder: "Descreva o assunto" },
      { name: "categoria", label: "Categoria", type: "select", options: ["Login", "Integração", "Cobrança", "Erro técnico", "Sugestão"] },
      { name: "prioridade", label: "Prioridade", type: "select", options: ["Alta", "Média", "Baixa"] },
      { name: "empresa", label: "Empresa", placeholder: "Nome da empresa" },
    ],
  },
  integracao: {
    title: "Nova integração",
    icon: Plug,
    submit: "Conectar",
    toast: "Integração registrada. Conexão disponível após o backend.",
    fields: [
      { name: "nome", label: "Serviço", type: "select", options: ["OpenAI", "Supabase", "Stripe", "WhatsApp", "E-mail"] },
      { name: "ambiente", label: "Ambiente", type: "select", options: ["Produção", "Homologação"] },
    ],
  },
}

export function MasterModals() {
  const { modal, closeModal, showToast } = useMaster()
  const [values, setValues] = useState<Record<string, string>>({})

  const cfg = modal ? modalConfig[modal] : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (cfg) showToast(cfg.toast)
    setValues({})
    closeModal()
  }

  return (
    <AnimatePresence>
      {cfg && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center"
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                    <cfg.icon className="w-4 h-4 text-gray-600" />
                  </span>
                  <span className="font-semibold text-foreground">{cfg.title}</span>
                </div>
                <button onClick={closeModal} aria-label="Fechar" className="p-2 -mr-2 hover:bg-gray-50 rounded-xl transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {cfg.fields.map((f) => (
                  <div key={f.name}>
                    <label htmlFor={f.name} className="block text-sm font-medium text-foreground mb-1.5">
                      {f.label}
                    </label>
                    {f.type === "select" ? (
                      <select
                        id={f.name}
                        value={values[f.name] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                      >
                        <option value="" disabled>
                          Selecione...
                        </option>
                        {f.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={f.name}
                        type={f.type ?? "text"}
                        value={values[f.name] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                      />
                    )}
                  </div>
                ))}

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Os dados cadastrados aqui serão habilitados quando a integração real estiver disponível.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 bg-gray-100 text-foreground rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    {cfg.submit}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function MasterToast() {
  const { toast } = useMaster()
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 bg-[#0a0a0a] text-white rounded-xl shadow-lg text-sm font-medium max-w-[90vw] text-center"
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
