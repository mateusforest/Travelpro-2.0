"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Loader2 } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, TableCard, StatusBadge, PrimaryButton } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"
import { getMasterWorkspacesAction } from "@/actions/master"

type Workspace = {
  id: string
  name: string
  type: string
  ownerName: string
  members: number
  createdAt: string | null
  status: string
}

const filtros = ["Todos", "Operacoes"] as const

function formatDateLabel(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export default function MasterWorkspacesPage() {
  const { openModal } = useMaster()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [filtro, setFiltro] = useState<(typeof filtros)[number]>("Todos")
  const [busca, setBusca] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      const result = await getMasterWorkspacesAction()

      if (result.error) {
        setError(result.error)
        setWorkspaces([])
        setIsLoading(false)
        return
      }

      setWorkspaces((result.workspaces ?? []) as Workspace[])
      setIsLoading(false)
    }

    void load()
  }, [])

  const filtrados = useMemo(() => {
    return workspaces.filter((workspace) => {
      const matchFiltro = filtro === "Todos" || workspace.type === filtro
      const matchBusca = workspace.name.toLowerCase().includes(busca.toLowerCase())
      return matchFiltro && matchBusca
    })
  }, [workspaces, filtro, busca])

  return (
    <div className="flex h-full flex-1 flex-col">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <MasterPageHeader
            title="Workspaces"
            description="Ambientes reais provisionados no TravelPro."
            actions={<PrimaryButton icon={Plus} onClick={() => openModal("workspace")}>Novo workspace</PrimaryButton>}
          />

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <TableCard
            toolbar={
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Buscar workspace..."
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 sm:w-56"
                  />
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-gray-50 p-1">
                  {filtros.map((item) => (
                    <button
                      key={item}
                      onClick={() => setFiltro(item)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        filtro === item ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                Carregando workspaces...
              </div>
            ) : (
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-5 py-3">Nome</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Owner</th>
                    <th className="px-5 py-3">Membros</th>
                    <th className="px-5 py-3">Criado em</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((workspace) => (
                    <tr key={workspace.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/60 last:border-0">
                      <td className="px-5 py-3.5 text-sm font-medium">{workspace.name}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{workspace.type}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{workspace.ownerName}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{workspace.members}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{formatDateLabel(workspace.createdAt)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={workspace.status} /></td>
                    </tr>
                  ))}
                  {filtrados.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                        {busca || filtro !== "Todos" ? "Nenhum workspace encontrado para os filtros atuais." : "Nenhum workspace encontrado."}
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

