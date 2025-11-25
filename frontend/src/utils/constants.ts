// 默认分类标签（type='category'的Tag）
// 这些将在数据库初始化时创建为Tag记录
export const DEFAULT_CATEGORY_TAGS = [
  { name: '饮食', color: '#f97316' },     // orange-500
  { name: '购物', color: '#ec4899' },    // pink-500
  { name: '居住', color: '#8b5cf6' },     // violet-500
  { name: '交通', color: '#3b82f6' },     // blue-500
  { name: '通讯', color: '#06b6d4' },     // cyan-500
  { name: '娱乐', color: '#10b981' },     // emerald-500
  { name: '信用还款', color: '#ef4444' }, // red-500
  { name: '生活必需', color: '#f59e0b' }, // amber-500
  { name: '娱乐消费', color: '#a855f7' }, // purple-500
] as const

// 保留旧的EXPENSE_CATEGORIES用于向后兼容（数据迁移时使用）
export const LEGACY_EXPENSE_CATEGORIES = [
  { value: '饮食', label: '饮食' },
  { value: '购物', label: '购物' },
  { value: '居住', label: '居住' },
  { value: '交通', label: '交通' },
  { value: '通讯', label: '通讯' },
  { value: '娱乐', label: '娱乐' },
  { value: '信用还款', label: '信用还款' },
  { value: '生活必需', label: '生活必需' },
  { value: '娱乐消费', label: '娱乐消费' },
] as const

// 投资类型
export const INVESTMENT_TYPES = [
  { value: 'precious_metal', label: '贵金属', icon: '🏆', color: 'yellow' },
  { value: 'equity', label: '权益类', icon: '📈', color: 'blue' },
  { value: 'fixed_income', label: '固收类', icon: '🏦', color: 'green' },
] as const
