"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronLeft, Lock, Check, ShieldCheck, Laptop } from "lucide-react"

export default function SegurancaPage() {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ current: "", next: "", confirm: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setForm({ current: "", next: "", confirm: "" })
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4 pb-32">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-100">
          <ShieldCheck className="h-6 w-6 text-gray-600" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#0a0a0a]">Senha e sessoes</h1>
          <p className="text-sm text-gray-500">
            Gerencie sua senha e acompanhe acessos quando o monitoramento estiver ativo.
          </p>
        </div>
      </div>

      <motion.form
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onSubmit={handleSubmit}
        className="mb-6 rounded-2xl border border-gray-100 bg-white p-4"
      >
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-[#0a0a0a]">Alterar senha</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: "current" as const, label: "Senha atual" },
            { key: "next" as const, label: "Nova senha" },
            { key: "confirm" as const, label: "Confirmar nova senha" },
          ].map((field) => (
            <div key={field.key}>
              <label className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">{field.label}</label>
              <input
                type="password"
                required
                value={form[field.key]}
                onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a0a0a] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Senha atualizada
            </>
          ) : (
            "Atualizar senha"
          )}
        </button>
      </motion.form>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
        <h2 className="mb-2 px-2 text-sm font-semibold text-gray-500">Dispositivos conectados</h2>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <Laptop className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#0a0a0a]">Nenhum dispositivo registrado ainda.</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                As sessoes conectadas serao exibidas quando o monitoramento de dispositivos estiver ativo.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
