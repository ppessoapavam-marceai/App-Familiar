export type CategoryOption = { name: string; emoji: string }
export type CategoryGroup = {
  label: string
  emoji: string
  kind: 'despesa' | 'receita'
  options: CategoryOption[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: 'Contas da casa',
    emoji: '🧾',
    kind: 'despesa',
    options: [
      { name: 'Luz', emoji: '💡' },
      { name: 'Água', emoji: '🚿' },
      { name: 'Gás', emoji: '🔥' },
      { name: 'Internet', emoji: '📶' },
      { name: 'Telefone', emoji: '📱' },
      { name: 'Aluguel/Condomínio', emoji: '🏠' },
      { name: 'Cartão de crédito', emoji: '💳' },
      { name: 'Plano de saúde', emoji: '🩺' },
      { name: 'Escola', emoji: '🎓' },
      { name: 'Assinaturas', emoji: '📺' },
      { name: 'Impostos', emoji: '🏛️' },
    ],
  },
  {
    label: 'Lugares',
    emoji: '📍',
    kind: 'despesa',
    options: [
      { name: 'Mercado', emoji: '🛒' },
      { name: 'Padaria', emoji: '🥖' },
      { name: 'Feira', emoji: '🥕' },
      { name: 'Farmácia', emoji: '💊' },
      { name: 'Restaurante/Delivery', emoji: '🍽️' },
      { name: 'Posto de gasolina', emoji: '⛽' },
      { name: 'Shopping', emoji: '🛍️' },
      { name: 'Pet shop', emoji: '🐾' },
    ],
  },
  {
    label: 'Outros gastos',
    emoji: '✨',
    kind: 'despesa',
    options: [
      { name: 'Transporte', emoji: '🚗' },
      { name: 'Saúde', emoji: '❤️‍🩹' },
      { name: 'Lazer', emoji: '🎉' },
      { name: 'Educação', emoji: '📚' },
      { name: 'Casa e reformas', emoji: '🛠️' },
      { name: 'Roupas', emoji: '👗' },
      { name: 'Presentes', emoji: '🎁' },
    ],
  },
  {
    label: 'Receitas',
    emoji: '💵',
    kind: 'receita',
    options: [
      { name: 'Salário', emoji: '💼' },
      { name: 'Extra/Freelance', emoji: '🧑‍💻' },
      { name: 'Rendimentos', emoji: '📈' },
      { name: 'Reembolso', emoji: '↩️' },
    ],
  },
]

export const categoryEmoji = (name: string) =>
  CATEGORY_GROUPS.flatMap((g) => g.options).find((o) => o.name.toLowerCase() === name.toLowerCase())?.emoji ?? '🏷️'

export const ALL_CATEGORY_NAMES = CATEGORY_GROUPS.flatMap((g) => g.options.map((o) => o.name))
