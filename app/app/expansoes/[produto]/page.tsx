"use client"

import { use } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Headphones, Shield } from "lucide-react"
import { expansionItemsBySlug } from "@/lib/expansion-configs"

export default function ExpansaoPage({ params }: { params: Promise<{ produto: string }> }) {
  const { produto } = use(params)
  const router = useRouter()
  const item = expansionItemsBySlug[produto]

  if (!item) {
    return (
      <div className="mx-auto max-w-lg px-4 py-4">
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Shield className="h-7 w-7 text-gray-400" />
          </div>
          <h1 className="mb-1 text-lg font-semibold text-[#0a0a0a]">Expansao nao encontrada</h1>
          <p className="max-w-xs text-sm text-gray-500">Este produto ainda nao esta disponivel no ecossistema TravelPro.</p>
        </div>
      </div>
    )
  }

  const FallbackIcon = item.icon === "headphones" ? Headphones : Shield

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: item.bg }}>
          {item.imageSrc ? (
            <div className="relative h-10 w-10 overflow-hidden rounded-xl">
              <Image src={item.imageSrc} alt={item.label} fill className="object-contain" sizes="40px" />
            </div>
          ) : (
            <FallbackIcon className="h-8 w-8" style={{ color: item.color }} />
          )}
        </div>
        <h1 className="text-xl font-semibold text-[#0a0a0a]">{item.label}</h1>
        <p className="mt-1 text-sm text-gray-500">Produto do ecossistema TravelPro.</p>

        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6">
          <p className="text-sm text-gray-600">Esta expansao ainda esta em breve e sera liberada em uma proxima etapa.</p>
        </div>

        <Link href="/app" className="tp-gradient-btn mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition-colors">
          Voltar ao app
        </Link>
      </div>
    </div>
  )
}
