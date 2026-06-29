export const operationalActionAliases = {
  create: ["crie", "criar", "cadastre", "cadastrar", "registre", "registrar", "lance", "lancar", "abra", "abrir", "gere", "gerar", "adicione", "adicionar", "novo", "nova"],
  update: ["atualize", "atualizar", "edite", "editar", "mude", "mudar", "altere", "alterar", "corrija", "corrigir", "troque", "trocar", "coloque"],
  read: ["ver", "mostrar", "consultar", "detalhar"],
  list: ["listar", "listar os", "mostrar todos", "mostrar todas"],
  search: ["buscar", "busque", "encontre", "encontrar", "procurar", "procure"],
  summarize: ["resumo", "balanco", "balanço", "saldo", "historico", "histórico", "ultimas atividades", "últimas atividades"],
  count: ["quantos", "quantas", "total de"],
  register: ["registre", "registrar", "lance", "lancar"],
  launch: ["lance", "lancar"],
  extract: ["extrair", "extraia"],
  generate: ["gere", "gerar"],
  open: ["abra", "abrir", "iniciar", "inicie"],
  send: ["envie", "enviar", "mande", "mandar", "compartilhe", "compartilhar"],
  classify: ["classifique", "classificar"],
  ask_clarification: ["qual", "quais", "sobre qual", "de qual"],
} as const

export type OperationalActionType = keyof typeof operationalActionAliases
export const operationalActionTypeValues = Object.keys(operationalActionAliases) as OperationalActionType[]
