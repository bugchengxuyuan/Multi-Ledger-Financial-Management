import { FinanceConfig } from '@/store/types'

// 计算安全可花金额
export function calculateSafeToSpend(
  totalSpent: number,
  config: FinanceConfig
): number {
  const remainingCredit = config.creditLimit - totalSpent
  const mustKeep = config.creditLimit - config.salary
  return remainingCredit - mustKeep
}

// 计算距离日期的天数
export function daysUntil(targetDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  const diffTime = target.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// 计算投资使用率
export function calculateInvestmentRate(
  totalInvestment: number,
  investmentCapital: number
): number {
  if (investmentCapital === 0) return 0
  return (totalInvestment / investmentCapital) * 100
}

// 财务健康度评估
export function getHealthStatus(safeToSpend: number) {
  if (safeToSpend < 0) {
    return { color: 'text-red-600', bg: 'bg-red-50', text: '超支', icon: '⚠️' }
  }
  if (safeToSpend < 500) {
    return { color: 'text-orange-600', bg: 'bg-orange-50', text: '紧张', icon: '⚠️' }
  }
  if (safeToSpend < 1000) {
    return { color: 'text-yellow-600', bg: 'bg-yellow-50', text: '注意', icon: '⚡' }
  }
  return { color: 'text-green-600', bg: 'bg-green-50', text: '健康', icon: '✓' }
}
