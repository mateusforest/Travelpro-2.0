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
    <div className="px-4 py-4 pb-32 max-w-lg mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-center gap-3 mb-6">
        <span className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-6 h-6 text-gray-600" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#0a0a0a]">Senha e sessoes</h1>
          <p className="text-sm text-gray-500">Gerencie sua senha e acompanhe acessos quando o monitoramento estiver ativo.</p>
        </div>
      </div>

      <motion.form
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-100 p-4 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-[#0a0a0a]">Alterar senha</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: "current" as const, label: "Senha atual" },
            { key: "next" as const, label: "Nova senha" },
            { key: "confirm" as const, label: "Confirmar nova senha" },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-[#0a0a0a] mb-1.5">{field.label}</label>
              <input
                type="password"
                required
                value={form[field.key]}
                onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="w-full mt-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-2"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" /> Senha atualizada
            </>
          ) : (
            "Atualizar senha"
          )}
        </button>
      </motion.form>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
        <h2 className="text-sm font-semibold text-gray-500 px-2 mb-2">Dispositivos conectados</h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Laptop className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#0a0a0a]">Nenhum dispositivo registrado ainda.</p>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                As sessoes conectadas serao exibidas quando o monitoramento de dispositivos estiver ativo.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
