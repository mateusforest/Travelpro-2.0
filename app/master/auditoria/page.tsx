"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, TableCard } from "@/components/master/master-ui"
import { getMasterAuditLogsAction } from "@/actions/master"

type AuditLog = {
  id: string
  action: string
  actionLabel: string
  category: string
  description: string
  actorName: string
  workspaceName: string
  createdAt: string | null
}

const filtros = ["Todos", "Usuário", "Assinatura", "Integração", "Workspace", "Sessão", "Sistema"]

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Agora"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Agora"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function MasterAuditoriaPage() {
  const [filtro, setFiltro] = useState("Todos")
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    setIsLoading(true)
    setError(null)

    void getMasterAuditLogsAction().then((result) => {
      if (!active) return

      if (result.error) {
        setError(result.error)
        setLogs([])
        setIsLoading(false)
        return
      }

      setLogs((result.logs ?? []) as AuditLog[])
      setIsLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const filtrados = useMemo(
    () => logs.filter((log) => filtro === "Todos" || log.category === filtro),
    [filtro, logs],
  )

  return (
    <div className="flex h-full flex-1 flex-col">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <MasterPageHeader title="Auditoria" description="Registro real de eventos e ações realizadas na plataforma." />

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <TableCard
            toolbar={
              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-50 p-1">
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
            }
          >
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-5 py-3">Evento</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Responsável</th>
                  <th className="px-5 py-3">Workspace</th>
                  <th className="px-5 py-3">Detalhe</th>
                  <th className="px-5 py-3 text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <tr key={index} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3.5" colSpan={6}>
                        <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    {filtrados.map((log) => (
                      <tr key={log.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/60 last:border-0">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                              <ArrowUpRight className="h-4 w-4 text-gray-600" />
                            </span>
                            <span className="text-sm font-medium">{log.actionLabel}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{log.category}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{log.actorName}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{log.workspaceName || "-"}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{log.description}</td>
                        <td className="px-5 py-3.5 text-right text-sm text-muted-foreground">{formatDateLabel(log.createdAt)}</td>
                      </tr>
                    ))}
                    {filtrados.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                          {filtro === "Todos" ? "Nenhum log registrado ainda." : "Nenhum evento neste filtro."}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </TableCard>
        </div>
      </div>
    </div>
  )
}
