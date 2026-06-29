"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Loader2 } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, TableCard, StatusBadge, PrimaryButton } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"
import { getMasterClientsAction } from "@/actions/master"

type Cliente = {
  id: string
  company: string
  type: string
  users: number
  status: string
  createdAt: string | null
}

const filtros = ["Todos", "Operações", "Connect"] as const

function formatDateLabel(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export default function MasterClientesPage() {
  const { openModal } = useMaster()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filtro, setFiltro] = useState<(typeof filtros)[number]>("Todos")
  const [busca, setBusca] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      const result = await getMasterClientsAction()

      if (result.error) {
        setError(result.error)
        setClientes([])
        setIsLoading(false)
        return
      }

      setClientes((result.clients ?? []) as Cliente[])
      setIsLoading(false)
    }

    void load()
  }, [])

  const filtrados = useMemo(() => {
    return clientes.filter((cliente) => {
      const matchFiltro = filtro === "Todos" || cliente.type === filtro
      const matchBusca = cliente.company.toLowerCase().includes(busca.toLowerCase())
      return matchFiltro && matchBusca
    })
  }, [clientes, filtro, busca])

  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader
            title="Clientes"
            description="Workspaces reais da plataforma tratados como clientes do COS."
            actions={<PrimaryButton icon={Plus} onClick={() => openModal("cliente")}>Novo cliente</PrimaryButton>}
          />

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <TableCard
            toolbar={
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Buscar empresa..."
                    className="w-full sm:w-56 pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                  {filtros.map((item) => (
                    <button
                      key={item}
                      onClick={() => setFiltro(item)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        filtro === item ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando clientes...
              </div>
            ) : (
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground border-b border-gray-100">
                    <th className="px-5 py-3">Empresa</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Usuários</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((cliente) => (
                    <tr key={cliente.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium">{cliente.company}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{cliente.type}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{cliente.users}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={cliente.status} /></td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{formatDateLabel(cliente.createdAt)}</td>
                    </tr>
                  ))}
                  {filtrados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                        {busca || filtro !== "Todos" ? "Nenhum cliente encontrado para os filtros atuais." : "Nenhum cliente cadastrado ainda."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </TableCard>
        </div>
      </div>
    </div>
  )
}
