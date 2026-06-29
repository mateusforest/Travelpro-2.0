"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Building2, Globe, Bell, CreditCard, Shield, ChevronRight } from "lucide-react"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"
import { toast } from "@/hooks/use-toast"

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-[#FE6708]" : "bg-gray-200"}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  )
}

export default function ConfiguracoesPage() {
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyPush, setNotifyPush] = useState(false)
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false)
  const [agency, setAgency] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
  })

  const handleSaveAgency = () => {
    toast({
      title: "Dados preparados",
      description: "Os dados da agência serão salvos quando o backend estiver conectado.",
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <PortalPageHeader title="Configurações" description="Gerencie preferências, agência e notificações do portal." />

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Dados da agência</h2>
            </div>

            <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-4 mb-5">
              <p className="text-sm text-muted-foreground">Sem dados cadastrados ainda.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Nome da agência</label>
                <input
                  type="text"
                  value={agency.nome}
                  onChange={(e) => setAgency((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome da agência"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">CNPJ</label>
                <input
                  type="text"
                  value={agency.cnpj}
                  onChange={(e) => setAgency((prev) => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="CNPJ"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">E-mail de contato</label>
                <input
                  type="email"
                  value={agency.email}
                  onChange={(e) => setAgency((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@agencia.com"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Telefone</label>
                <input
                  type="tel"
                  value={agency.telefone}
                  onChange={(e) => setAgency((prev) => ({ ...prev, telefone: e.target.value }))}
                  placeholder="+55 00 00000-0000"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button onClick={handleSaveAgency} className="rounded-xl bg-[#FE6708] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#FE8414]">
                Salvar alterações
              </button>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Preferências regionais</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Idioma</label>
                <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                  <option>Português (Brasil)</option>
                  <option>English (US)</option>
                  <option>Español</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Moeda</label>
                <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                  <option>Real (R$)</option>
                  <option>Dólar (US$)</option>
                  <option>Euro (€)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Fuso horário</label>
                <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                  <option>Brasília (GMT-3)</option>
                  <option>Lisboa (GMT)</option>
                </select>
              </div>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Notificações</h2>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Por e-mail</p>
                  <p className="text-xs text-muted-foreground">Resumo diário e alertas importantes.</p>
                </div>
                <Toggle checked={notifyEmail} onChange={() => setNotifyEmail((value) => !value)} />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Push no navegador</p>
                  <p className="text-xs text-muted-foreground">Notificações em tempo real.</p>
                </div>
                <Toggle checked={notifyPush} onChange={() => setNotifyPush((value) => !value)} />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Por WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Alertas críticos quando a integração estiver disponível.</p>
                </div>
                <Toggle checked={notifyWhatsapp} onChange={() => setNotifyWhatsapp((value) => !value)} />
              </div>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => toast({ title: "Plano indisponível", description: "Plano e faturamento serão conectados em uma etapa futura." })}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-left hover:shadow-sm transition-shadow flex items-center gap-4"
            >
              <span className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </span>
              <div className="flex-1">
                <p className="font-medium">Plano e faturamento</p>
                <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa ainda.</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>

            <button
              onClick={() => toast({ title: "Segurança em preparação", description: "Senha, 2FA e sessões serão gerenciadas quando o backend estiver conectado." })}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-left hover:shadow-sm transition-shadow flex items-center gap-4"
            >
              <span className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </span>
              <div className="flex-1">
                <p className="font-medium">Segurança</p>
                <p className="text-sm text-muted-foreground">Nenhuma sessão ativa registrada ainda.</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
