// Plantilla de categorías por defecto. Se usa para poblar el árbol de un
// usuario nuevo justo después de crearlo. No se corre "a mano" contra la
// base de datos entera: se llama una vez por usuario (ver categories.service.ts).

export interface DefaultCategoryTemplate {
  name: string;
  type: 'EXPENSE' | 'INCOME';
  nature: 'ESSENTIAL' | 'DISCRETIONARY' | 'OTHER';
  icon: string;
  keywords?: string[];
  children?: DefaultCategoryTemplate[];
}

export const DEFAULT_CATEGORY_TREE: DefaultCategoryTemplate[] = [
  {
    name: 'Vivienda',
    type: 'EXPENSE',
    nature: 'ESSENTIAL',
    icon: '🏠',
    children: [
      { name: 'Renta', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '🏘️' },
      { name: 'Luz', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '💡' },
      { name: 'Internet', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '📶' },
      { name: 'Reparaciones', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '🔧' },
    ],
  },
  {
    name: 'Educación',
    type: 'EXPENSE',
    nature: 'ESSENTIAL',
    icon: '🎓',
    children: [
      { name: 'Colegiaturas', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '🏫' },
      { name: 'Cursos', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '📖' },
      { name: 'Exámenes', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '📝' },
    ],
  },
  {
    name: 'Salud',
    type: 'EXPENSE',
    nature: 'ESSENTIAL',
    icon: '⚕️',
    children: [
      { name: 'Doctor', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '🩺' },
      { name: 'Farmacia', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '💊' },
      { name: 'Lentes', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '👓' },
      { name: 'Exámenes médicos', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '🧪' },
    ],
  },
  {
    name: 'Comida',
    type: 'EXPENSE',
    nature: 'ESSENTIAL',
    icon: '🍔',
    children: [
      {
        name: 'Supermercado',
        type: 'EXPENSE',
        nature: 'ESSENTIAL',
        icon: '🛒',
        keywords: ['WALMART', 'SORIANA', 'CHEDRAUI', 'COSTCO', 'SAMS', 'LA COMER'],
      },
    ],
  },
  {
    name: 'Transporte',
    type: 'EXPENSE',
    nature: 'ESSENTIAL',
    icon: '🚗',
    children: [
      { name: 'Gasolina', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '⛽' },
      { name: 'Transporte público', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '🚌' },
      { name: 'Mantenimiento', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '🔩' },
    ],
  },
  {
    name: 'Deudas y tarjetas',
    type: 'EXPENSE',
    nature: 'ESSENTIAL',
    icon: '💳',
    children: [
      { name: 'Pago tarjeta de crédito', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '💳' },
      { name: 'Préstamos', type: 'EXPENSE', nature: 'ESSENTIAL', icon: '🏦' },
    ],
  },
  {
    name: 'Estilo de vida',
    type: 'EXPENSE',
    nature: 'DISCRETIONARY',
    icon: '✨',
    children: [
      {
        name: 'Restaurantes',
        type: 'EXPENSE',
        nature: 'DISCRETIONARY',
        icon: '🍽️',
      },
      {
        name: 'Café',
        type: 'EXPENSE',
        nature: 'DISCRETIONARY',
        icon: '☕',
        keywords: ['STARBUCKS', 'CAFE', 'CIELITO'],
      },
      {
        name: 'Dulces y snacks',
        type: 'EXPENSE',
        nature: 'DISCRETIONARY',
        icon: '🍬',
      },
      { name: 'Entretenimiento', type: 'EXPENSE', nature: 'DISCRETIONARY', icon: '🎮' },
      { name: 'Joyería', type: 'EXPENSE', nature: 'DISCRETIONARY', icon: '💍' },
      { name: 'Suscripciones', type: 'EXPENSE', nature: 'DISCRETIONARY', icon: '🔁' },
    ],
  },
  {
    name: 'Ahorro y metas',
    type: 'EXPENSE',
    nature: 'ESSENTIAL',
    icon: '💰',
  },
  {
    name: 'Otros',
    type: 'EXPENSE',
    nature: 'OTHER',
    icon: '❓',
  },
  // --- Ingresos ---
  {
    name: 'Sueldo',
    type: 'INCOME',
    nature: 'ESSENTIAL',
    icon: '💼',
  },
  {
    name: 'Negocio propio',
    type: 'INCOME',
    nature: 'ESSENTIAL',
    icon: '🏪',
  },
  {
    name: 'Inversiones',
    type: 'INCOME',
    nature: 'ESSENTIAL',
    icon: '📈',
  },
  {
    name: 'Emprendimiento',
    type: 'INCOME',
    nature: 'ESSENTIAL',
    icon: '🚀',
  },
];
