"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Camera, Check, ChevronLeft, FileQuestion, Upload } from "lucide-react"
import { createClientAction } from "@/actions/clients"
import { createDocumentAction } from "@/actions/documents"
import { createFinancialEntryAction } from "@/actions/financial"
import { createMeetingAction } from "@/actions/meetings"
import { createOperationAction } from "@/actions/operations"
import { fotoConfig, novoConfigs, type NovoConfig } from "@/lib/novo-configs"
import { publishOperationSync } from "@/lib/operation-sync"

export default function NovoPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = use(params)
  const [submitted, setSubmitted] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const config: NovoConfig | undefined = tipo === "foto" ? fotoConfig : novoConfigs[tipo]
  const hasRealPersistence = ["cliente", "financeiro", "operacao", "documento", "reuniao"].includes(tipo)

  if (!config) {
    return (
      <div className="mx-auto max-w-lg px-4 py-4">
        <BackButton />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <FileQuestion className="h-7 w-7 text-gray-400" />
          </div>
          <h1 className="mb-1 text-lg font-semibold text-[#0a0a0a]">Em preparacao</h1>
          <p className="max-w-xs text-sm text-gray-500">
            Este recurso ainda esta sendo preparado e estara disponivel em breve.
          </p>
          <Link href="/app" className="mt-5 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white">
            Voltar ao inicio
          </Link>
        </div>
      </div>
    )
  }

  const Icon = config.icon

  const submitForm = async () => {
    if (tipo === "cliente") {
      return createClientAction({
        name: formValues.nome ?? "",
        email: formValues.email ?? "",
        phone: formValues.telefone ?? "",
        company: formValues.empresa ?? "",
        notes: formValues.observacoes ?? "",
        status: (formValues.status ?? "Ativo").toLowerCase() === "arquivado" ? "archived" : "active",
      })
    }

    if (tipo === "financeiro") {
      return createFinancialEntryAction({
        type: formValues.tipo ?? "Ganho",
        title: formValues.titulo ?? "",
        amount: formValues.valor ?? "",
        category: formValues.categoria ?? "",
        dueDate: formValues.data ?? "",
        notes: formValues.observacoes ?? "",
      })
    }

    if (tipo === "operacao") {
      return createOperationAction({
        title: formValues.nome ?? "",
        description: [
          formValues.tipo ? `Tipo: ${formValues.tipo}` : "",
          formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
          formValues.descricao ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
        dueDate: formValues.prazo ?? "",
        status: "open",
        priority: "medium",
      })
    }

    if (tipo === "documento") {
      return createDocumentAction({
        title: formValues.titulo ?? "",
        type: formValues.tipo ?? "Outro",
        content: formValues.conteudo ?? "",
        status: "draft",
      })
    }

    if (tipo === "reuniao") {
      return createMeetingAction({
        title: formValues.titulo ?? "",
        summary: [
          formValues.participantes ? `Participantes: ${formValues.participantes}` : "",
          formValues.data ? `Data: ${formValues.data}` : "",
          formValues.tipo ? `Modalidade: ${formValues.tipo}` : "",
          formValues.pauta ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
        status: "draft",
      })
    }

    return {
      error: "Este recurso ainda esta em preparacao e nao possui persistencia real no COS.",
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mb-1 text-lg font-semibold text-[#0a0a0a]">Tudo certo!</h1>
          <p className="mb-6 text-sm text-gray-500">{config.title} salvo com sucesso.</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSubmitted(false)
                setFormValues({})
              }}
              className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Criar outro
            </button>
            <Link href="/app" className="rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
              Concluir
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <BackButton />

      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: config.bg }}>
          <Icon className="h-6 w-6" style={{ color: config.color }} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#0a0a0a]">{config.title}</h1>
          <p className="text-sm text-gray-500">{config.subtitle}</p>
        </div>
      </div>

      {!hasRealPersistence && (
        <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Este fluxo ainda esta em preparacao. O preenchimento pode ser revisado, mas nada sera salvo no sistema por enquanto.
        </div>
      )}

      {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <form
        onSubmit={async (event) => {
          event.preventDefault()
          setIsSubmitting(true)
          setError("")

          const result = await submitForm()

          setIsSubmitting(false)

          if ("error" in result && result.error) {
            setError(result.error)
            return
          }

          publishOperationSync({ source: "app" })
          setSubmitted(true)
        }}
        className="space-y-4"
      >
        {tipo === "foto" ? (
          <PhotoCapture />
        ) : (
          config.fields.map((field) => (
            <div key={field.name}>
              <label className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  required={field.required}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              ) : field.type === "select" ? (
                <select
                  required={field.required}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === "file" ? (
                <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-white py-8 transition-colors hover:border-gray-300">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <span className="text-sm text-gray-500">Clique para selecionar um arquivo</span>
                  <input type="file" className="hidden" />
                </label>
              ) : (
                <input
                  type={field.type}
                  required={field.required}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              )}
            </div>
          ))
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-xl bg-[#0a0a0a] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : config.cta}
        </button>
      </form>
    </div>
  )
}

function BackButton() {
  const router = useRouter()
  return (
    <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700">
      <ChevronLeft className="h-4 w-4" /> Voltar
    </button>
  )
}

function PhotoCapture() {
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  return (
    <div className="space-y-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview || "/placeholder.svg"} alt="Pre-visualizacao" className="w-full rounded-2xl border border-gray-200" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-8 transition-colors hover:bg-gray-50">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50">
              <Camera className="h-5 w-5 text-pink-500" />
            </span>
            <span className="text-sm font-medium text-[#0a0a0a]">Tirar foto</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-8 transition-colors hover:bg-gray-50">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
              <Upload className="h-5 w-5 text-blue-500" />
            </span>
            <span className="text-sm font-medium text-[#0a0a0a]">Upload</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
        </div>
      )}
      {preview && (
        <button
          type="button"
          onClick={() => setPreview(null)}
          className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          Trocar imagem
        </button>
      )}
    </div>
  )
}
