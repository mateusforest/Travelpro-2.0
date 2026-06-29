import Link from "next/link"

const sections = [
  {
    title: "Uso da plataforma",
    body:
      "O COS e disponibilizado para organizacao operacional, historico de atividades, conversas e configuracoes do workspace. O uso deve respeitar a legislacao aplicavel e as politicas internas da sua operacao.",
  },
  {
    title: "Responsabilidade sobre dados",
    body:
      "Cada workspace e responsavel pelas informacoes cadastradas, pelos acessos concedidos a membros da equipe e pela revisao dos registros importantes antes de qualquer decisao operacional.",
  },
  {
    title: "Disponibilidade e evolucao",
    body:
      "O COS pode receber melhorias, manutencoes e ajustes tecnicos para estabilidade e seguranca. Recursos ainda em preparacao sao apresentados de forma explicita quando nao houver execucao real disponivel.",
  },
]

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f3] px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="inline-flex rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
          COS
        </span>
        <h1 className="mt-4 text-3xl font-semibold text-[#0a0a0a]">Termos de uso</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Estes termos resumem como o COS deve ser utilizado dentro do seu workspace. Sao um ponto institucional minimo para cadastro e acesso a plataforma.
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
          <Link href="/privacidade" className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Politica de privacidade
          </Link>
        </div>
      </div>
    </main>
  )
}
