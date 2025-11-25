// 安全的数字转换，处理 undefined/null/NaN
export function toNumber(value: any, defaultValue: number = 0): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

// 安全的除法运算，避免除以 0
export function safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
  if (denominator === 0 || isNaN(denominator) || isNaN(numerator)) {
    return defaultValue
  }
  return numerator / denominator
}

// 格式化金额
export function formatCurrency(amount: number | string): string {
  const numAmount = toNumber(amount)
  return `¥${numAmount.toFixed(2)}`
}

// 格式化日期
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// 格式化简短日期
export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

// 格式化百分比
export function formatPercentage(value: number | string): string {
  const numValue = toNumber(value)
  return `${numValue.toFixed(1)}%`
}
