"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Loader2 } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, TableCard, StatusBadge, PrimaryButton } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"
import { getMasterUsersAction } from "@/actions/master"

type Usuario = {
  id: string
  fullName: string
  email: string
  globalRole: string
  workspaces: string[]
  createdAt: string | null
}

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

function roleLabel(value: string) {
  if (value === "master") return "Master"
  return "Ativo"
}

export default function MasterUsuariosPage() {
  const { openModal } = useMaster()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [busca, setBusca] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      const result = await getMasterUsersAction()

      if (result.error) {
        setError(result.error)
        setUsuarios([])
        setIsLoading(false)
        return
      }

      setUsuarios((result.users ?? []) as Usuario[])
      setIsLoading(false)
    }

    void load()
  }, [])

  const filtrados = useMemo(() => {
    return usuarios.filter((usuario) => {
      const term = busca.toLowerCase()
      return (
        usuario.fullName.toLowerCase().includes(term) ||
        usuario.email.toLowerCase().includes(term) ||
        usuario.workspaces.join(" ").toLowerCase().includes(term)
      )
    })
  }, [usuarios, busca])

  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader
            title="Usuários"
            description="Perfis reais e vínculos globais em todos os workspaces da plataforma."
            actions={<PrimaryButton icon={Plus} onClick={() => openModal("usuario")}>Novo usuário</PrimaryButton>}
          />

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <TableCard
            toolbar={
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar nome, e-mail ou workspace..."
                  className="w-full sm:w-72 pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            }
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando usuários...
              </div>
            ) : (
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground border-b border-gray-100">
                    <th className="px-5 py-3">Nome</th>
                    <th className="px-5 py-3">E-mail</th>
                    <th className="px-5 py-3">Papel global</th>
                    <th className="px-5 py-3">Workspaces</th>
                    <th className="px-5 py-3">Criado em</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((usuario) => (
                    <tr key={usuario.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                            {usuario.fullName.charAt(0)}
                          </span>
                          <span className="text-sm font-medium">{usuario.fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{usuario.email}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{usuario.globalRole}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {usuario.workspaces.length > 0 ? usuario.workspaces.join(", ") : "Sem workspace"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{formatDateLabel(usuario.createdAt)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={roleLabel(usuario.globalRole)} /></td>
                    </tr>
                  ))}
                  {filtrados.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                        {busca ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado ainda."}
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
