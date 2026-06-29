import Link from "next/link"

const sections = [
  {
    title: "Dados coletados",
    body:
      "O COS utiliza os dados informados no cadastro, no perfil e no workspace para autenticar acessos, organizar a operacao e registrar historicos das acoes realizadas.",
  },
  {
    title: "Uso interno",
    body:
      "As informacoes do workspace sao tratadas para viabilizar funcionalidades reais da plataforma, como conversas, cadastros, documentos, reunioes, financeiro e suporte.",
  },
  {
    title: "Controle e seguranca",
    body:
      "O acesso aos dados depende das permissoes do usuario no workspace. Sempre que possivel, o COS utiliza validacoes tecnicas e controles de sessao para proteger o ambiente.",
  },
]

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#f5f5f3] px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="inline-flex rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
          COS
        </span>
        <h1 className="mt-4 text-3xl font-semibold text-[#0a0a0a]">Politica de privacidade</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Esta pagina resume como o COS trata os dados usados para autenticar usuarios, organizar workspaces e registrar a operacao do sistema.
        </p>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-[#0a0a0a]">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/cadastro" className="rounded-2xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
            Voltar ao cadastro
          </Link>
          <Link href="/termos" className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Termos de uso
          </Link>
        </div>
      </div>
    </main>
  )
}
