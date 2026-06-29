import {
  UserPlus, Briefcase, FileText, DollarSign, Calendar, Paperclip, Camera,
  FileEdit, CheckSquare, BarChart3, ClipboardList, Megaphone, Link2,
  type LucideIcon,
} from "lucide-react"

export type Field = {
  name: string
  label: string
  type: "text" | "textarea" | "select" | "number" | "date" | "email" | "tel" | "file"
  placeholder?: string
  options?: string[]
  required?: boolean
}

export type NovoConfig = {
  title: string
  subtitle: string
  icon: LucideIcon
  color: string
  bg: string
  cta: string
  fields: Field[]
}

export const novoConfigs: Record<string, NovoConfig> = {
  cliente: {
    title: "Novo cliente",
    subtitle: "Cadastre um novo cliente na sua opera\u00e7\u00e3o.",
    icon: UserPlus,
    color: "#3b82f6",
    bg: "#dbeafe",
    cta: "Cadastrar cliente",
    fields: [
      { name: "nome", label: "Nome completo", type: "text", placeholder: "Ex: Jo\u00e3o Silva", required: true },
      { name: "email", label: "E-mail", type: "email", placeholder: "email@empresa.com" },
      { name: "telefone", label: "Telefone", type: "tel", placeholder: "(11) 99999-9999" },
        { name: "empresa", label: "Empresa", type: "text", placeholder: "Nome da empresa" },
        { name: "status", label: "Status", type: "select", options: ["Ativo", "Arquivado"] },
      { name: "observacoes", label: "Observa\u00e7\u00f5es", type: "textarea", placeholder: "Anota\u00e7\u00f5es sobre o cliente..." },
    ],
  },
  operacao: {
    title: "Nova opera\u00e7\u00e3o",
    subtitle: "Inicie uma nova opera\u00e7\u00e3o ou projeto.",
    icon: Briefcase,
    color: "#8b5cf6",
    bg: "#ede9fe",
    cta: "Criar opera\u00e7\u00e3o",
    fields: [
      { name: "nome", label: "Nome da opera\u00e7\u00e3o", type: "text", placeholder: "Nome da opera\u00e7\u00e3o", required: true },
      { name: "responsavel", label: "Respons\u00e1vel", type: "select", options: ["Definir depois"] },
      { name: "tipo", label: "Tipo", type: "select", options: ["Projeto", "Ordem", "Processo", "Atendimento"] },
      { name: "prazo", label: "Prazo", type: "date" },
      { name: "descricao", label: "Descri\u00e7\u00e3o", type: "textarea", placeholder: "Detalhes da opera\u00e7\u00e3o..." },
    ],
  },
  contrato: {
    title: "Novo contrato",
    subtitle: "Gere um contrato para cliente ou fornecedor.",
    icon: FileText,
    color: "#ef4444",
    bg: "#fee2e2",
    cta: "Gerar contrato",
    fields: [
      { name: "titulo", label: "T\u00edtulo do contrato", type: "text", placeholder: "Ex: Contrato de servi\u00e7o", required: true },
      { name: "cliente", label: "Cliente", type: "text", placeholder: "Nome do cliente" },
      { name: "valor", label: "Valor (R$)", type: "number", placeholder: "0,00" },
      { name: "vigencia", label: "Vig\u00eancia", type: "select", options: ["Mensal", "Trimestral", "Semestral", "Anual"] },
      { name: "observacoes", label: "Cl\u00e1usulas adicionais", type: "textarea", placeholder: "Termos espec\u00edficos..." },
    ],
  },
  financeiro: {
    title: "Novo lan\u00e7amento",
    subtitle: "Registre um ganho ou gasto na opera\u00e7\u00e3o.",
    icon: DollarSign,
    color: "#22c55e",
    bg: "#dcfce7",
    cta: "Registrar lan\u00e7amento",
    fields: [
      { name: "tipo", label: "Tipo", type: "select", options: ["Ganho", "Gasto"], required: true },
        { name: "titulo", label: "T\u00edtulo", type: "text", placeholder: "Ex: Pagamento de servi\u00e7o", required: true },
        { name: "valor", label: "Valor (R$)", type: "number", placeholder: "0,00", required: true },
        { name: "categoria", label: "Categoria", type: "select", options: ["Vendas", "Servi\u00e7os", "Fornecedores", "Operacional", "Impostos"] },
        { name: "data", label: "Data", type: "date" },
        { name: "observacoes", label: "Observa\u00e7\u00f5es", type: "textarea", placeholder: "Notas do lan\u00e7amento..." },
      ],
  },
  reuniao: {
    title: "Nova reuni\u00e3o",
    subtitle: "Agende uma reuni\u00e3o ou inicie uma grava\u00e7\u00e3o.",
    icon: Calendar,
    color: "#0ea5e9",
    bg: "#e0f2fe",
    cta: "Agendar reuni\u00e3o",
    fields: [
      { name: "titulo", label: "Assunto", type: "text", placeholder: "Ex: Alinhamento comercial", required: true },
      { name: "participantes", label: "Participantes", type: "text", placeholder: "Ex: Equipe comercial" },
      { name: "data", label: "Data", type: "date" },
      { name: "tipo", label: "Modalidade", type: "select", options: ["Presencial", "Online", "H\u00edbrida"] },
      { name: "pauta", label: "Pauta", type: "textarea", placeholder: "Itens a discutir..." },
    ],
  },
  arquivo: {
    title: "Novo arquivo",
    subtitle: "Envie um arquivo para a opera\u00e7\u00e3o.",
    icon: Paperclip,
    color: "#6b7280",
    bg: "#f3f4f6",
    cta: "Enviar arquivo",
    fields: [
      { name: "nome", label: "Nome do arquivo", type: "text", placeholder: "Ex: Apresenta\u00e7\u00e3o comercial" },
      { name: "arquivo", label: "Arquivo", type: "file" },
      { name: "pasta", label: "Pasta", type: "select", options: ["Contratos", "Propostas", "Termos", "Geral"] },
    ],
  },
  documento: {
    title: "Novo documento",
    subtitle: "Crie um documento com o COS.",
    icon: FileEdit,
    color: "#3b82f6",
    bg: "#dbeafe",
    cta: "Criar documento",
    fields: [
      { name: "titulo", label: "T\u00edtulo", type: "text", placeholder: "Ex: Proposta comercial", required: true },
      { name: "tipo", label: "Tipo", type: "select", options: ["Contrato", "Arquivo", "Relat\u00f3rio", "Proposta", "Outro"] },
      { name: "conteudo", label: "Conte\u00fado", type: "textarea", placeholder: "Escreva ou pe\u00e7a ao COS para gerar..." },
    ],
  },
  tarefa: {
    title: "Nova tarefa",
    subtitle: "Adicione uma tarefa \u00e0 sua opera\u00e7\u00e3o.",
    icon: CheckSquare,
    color: "#22c55e",
    bg: "#dcfce7",
    cta: "Criar tarefa",
    fields: [
      { name: "titulo", label: "Tarefa", type: "text", placeholder: "Ex: Enviar proposta", required: true },
      { name: "responsavel", label: "Respons\u00e1vel", type: "select", options: ["Definir depois"] },
      { name: "prazo", label: "Prazo", type: "date" },
      { name: "prioridade", label: "Prioridade", type: "select", options: ["Alta", "M\u00e9dia", "Baixa"] },
    ],
  },
  relatorio: {
    title: "Novo relat\u00f3rio",
    subtitle: "Gere um relat\u00f3rio da opera\u00e7\u00e3o.",
    icon: BarChart3,
    color: "#f97316",
    bg: "#ffedd5",
    cta: "Gerar relat\u00f3rio",
    fields: [
      { name: "titulo", label: "T\u00edtulo", type: "text", placeholder: "Ex: Relat\u00f3rio de vendas" },
      { name: "tipo", label: "Tipo", type: "select", options: ["Financeiro", "Vendas", "Opera\u00e7\u00f5es", "Equipe"] },
      { name: "periodo", label: "Per\u00edodo", type: "select", options: ["Hoje", "7 dias", "30 dias", "Personalizado"] },
    ],
  },
  formulario: {
    title: "Novo formul\u00e1rio",
    subtitle: "Crie um formul\u00e1rio para captar dados.",
    icon: ClipboardList,
    color: "#8b5cf6",
    bg: "#ede9fe",
    cta: "Criar formul\u00e1rio",
    fields: [
      { name: "titulo", label: "T\u00edtulo do formul\u00e1rio", type: "text", placeholder: "Ex: Cadastro de leads", required: true },
      { name: "objetivo", label: "Objetivo", type: "select", options: ["Capta\u00e7\u00e3o de leads", "Pesquisa", "Inscri\u00e7\u00e3o", "Feedback"] },
      { name: "descricao", label: "Descri\u00e7\u00e3o", type: "textarea", placeholder: "Sobre o formul\u00e1rio..." },
    ],
  },
  marketing: {
    title: "Nova campanha",
    subtitle: "Crie uma campanha de marketing.",
    icon: Megaphone,
    color: "#ec4899",
    bg: "#fce7f3",
    cta: "Criar campanha",
    fields: [
      { name: "nome", label: "Nome da campanha", type: "text", placeholder: "Ex: Promo\u00e7\u00e3o de inverno", required: true },
      { name: "canal", label: "Canal", type: "select", options: ["WhatsApp", "E-mail", "Instagram", "SMS"] },
      { name: "publico", label: "P\u00fablico", type: "text", placeholder: "Ex: Clientes ativos" },
      { name: "mensagem", label: "Mensagem", type: "textarea", placeholder: "Conte\u00fado da campanha..." },
    ],
  },
  integracao: {
    title: "Nova integra\u00e7\u00e3o",
    subtitle: "Conecte uma ferramenta ao COS.",
    icon: Link2,
    color: "#0ea5e9",
    bg: "#e0f2fe",
    cta: "Conectar integra\u00e7\u00e3o",
    fields: [
      { name: "servico", label: "Servi\u00e7o", type: "select", options: ["WhatsApp Business", "Google Calendar", "Instagram", "Stripe", "Slack"], required: true },
      { name: "conta", label: "Conta / Identificador", type: "text", placeholder: "Conta ou identificador" },
    ],
  },
}

export const fotoConfig: NovoConfig = {
  title: "Adicionar foto",
  subtitle: "Registre uma foto na opera\u00e7\u00e3o.",
  icon: Camera,
  color: "#ec4899",
  bg: "#fce7f3",
  cta: "Salvar foto",
  fields: [],
}

