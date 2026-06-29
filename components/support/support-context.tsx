"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Headset, LifeBuoy, CreditCard, Plug, HelpCircle, Loader2, X, Send } from "lucide-react"
import { createSupportTicketAction } from "@/actions/support"

export type SupportCategory =
  | "Dúvida sobre o COS"
  | "Problema técnico"
  | "Plano ou cobrança"
  | "Integrações"
  | "Falar com atendimento"

type SupportContextValue = {
  openSupport: (category?: SupportCategory) => void
  closeSupport: () => void
  refreshKey: number
}

type SupportOption = {
  icon: typeof HelpCircle
  label: SupportCategory
}

const SupportContext = createContext<SupportContextValue | null>(null)

const supportOptions: SupportOption[] = [
  { icon: HelpCircle, label: "Dúvida sobre o COS" },
  { icon: LifeBuoy, label: "Problema técnico" },
  { icon: CreditCard, label: "Plano ou cobrança" },
  { icon: Plug, label: "Integrações" },
  { icon: Headset, label: "Falar com atendimento" },
]

const priorities = ["Baixa", "Média", "Alta", "Urgente"] as const

export function useSupport() {
  const context = useContext(SupportContext)
  if (!context) {
    throw new Error("useSupport deve ser usado dentro de SupportProvider")
  }
  return context
}

export function SupportProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<SupportCategory>("Dúvida sobre o COS")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<(typeof priorities)[number]>("Média")
  const [refreshKey, setRefreshKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const reset = () => {
    setCategory("Dúvida sobre o COS")
    setSubject("")
    setDescription("")
    setPriority("Média")
    setFeedback(null)
    setIsSubmitting(false)
  }

  const closeSupport = () => {
    setOpen(false)
    reset()
  }

  const openSupport = (nextCategory?: SupportCategory) => {
    setCategory(nextCategory ?? "Dúvida sobre o COS")
    setSubject("")
    setDescription("")
    setPriority("Média")
    setFeedback(null)
    setOpen(true)
  }

  const value = useMemo(
    () => ({
      openSupport,
      closeSupport,
      refreshKey,
    }),
    [refreshKey],
  )

  const submit = async () => {
    setIsSubmitting(true)
    setFeedback(null)

    const result = await createSupportTicketAction({
      category,
      subject,
      description,
      priority,
    })

    if (result.error) {
      setFeedback({ type: "error", message: result.error })
      setIsSubmitting(false)
      return
    }

    setFeedback({ type: "success", message: result.message ?? "Chamado criado com sucesso." })
    setRefreshKey((current) => current + 1)
    setSubject("")
    setDescription("")
    setPriority("Média")
    setIsSubmitting(false)
  }

  return (
    <SupportContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
              onClick={closeSupport}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-[90] bg-white rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-md lg:rounded-3xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#0a0a0a]">Suporte COS</h2>
                <button onClick={closeSupport} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors" aria-label="Fechar">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {feedback && (
                  <div
                    className={`rounded-2xl border p-4 text-sm leading-relaxed ${
                      feedback.type === "success"
                        ? "border-green-100 bg-green-50 text-green-700"
                        : "border-red-100 bg-red-50 text-red-700"
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}

                <div className="space-y-2">
                  {supportOptions.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setCategory(option.label)}
                      className={`flex items-center gap-3 w-full p-3 rounded-2xl border text-left transition-colors ${
                        category === option.label ? "border-gray-300 bg-gray-50" : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <option.icon className="w-5 h-5 text-gray-600" />
                      </span>
                      <span className="text-sm font-medium text-[#0a0a0a]">{option.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <Field label="Categoria">
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value as SupportCategory)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-gray-300"
                    >
                      {supportOptions.map((option) => (
                        <option key={option.label} value={option.label}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Assunto">
                    <input
                      type="text"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="Descreva o assunto"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-gray-300"
                    />
                  </Field>

                  <Field label="Descrição">
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Conte um pouco mais sobre o que você precisa."
                      rows={4}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-gray-300 resize-none"
                    />
                  </Field>

                  <Field label="Prioridade">
                    <div className="grid grid-cols-2 gap-2">
                      {priorities.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPriority(item)}
                          className={`rounded-2xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                            priority === item ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Seu chamado será salvo no suporte real do COS e ficará disponível nesta conversa.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeSupport}
                    disabled={isSubmitting}
                    className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={isSubmitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar solicitação
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </SupportContext.Provider>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      {children}
    </label>
  )
}
