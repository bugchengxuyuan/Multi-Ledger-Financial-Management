import { FinanceStats, FinanceConfig, Expense, Reimbursement, Tag } from '@/store/types'
import { toNumber, safeDivide } from './formatters'

// 财务健康评分系统
export interface HealthScore {
  score: number  // 0-100分
  grade: '优秀' | '良好' | '注意' | '危险'
  color: string
  bgColor: string
  icon: string
  description: string
}

export function calculateHealthScore(
  stats: FinanceStats,
  config: FinanceConfig,
  expenses: Expense[]
): HealthScore {
  let score = 0

  // 1. 安全可花金额评分 (30分)
  if (stats.safeToSpend > 2000) {
    score += 30
  } else if (stats.safeToSpend > 1000) {
    score += 20
  } else if (stats.safeToSpend > 500) {
    score += 10
  } else if (stats.safeToSpend > 0) {
    score += 5
  }

  // 2. 使用率评分 (25分)
  const usageRate = safeDivide(stats.totalSpent, config.creditLimit) * 100
  if (usageRate < 40) {
    score += 25
  } else if (usageRate < 60) {
    score += 20
  } else if (usageRate < 80) {
    score += 10
  } else if (usageRate < 100) {
    score += 5
  }

  // 3. 超支记录评分 (20分)
  if (stats.safeToSpend >= 0) {
    score += 20
  }

  // 4. 待报销占比评分 (15分)
  const reimbursementRate = stats.totalSpent > 0
    ? (stats.pendingReimbursement / stats.totalSpent) * 100
    : 0
  if (reimbursementRate < 10) {
    score += 15
  } else if (reimbursementRate < 20) {
    score += 10
  } else if (reimbursementRate < 30) {
    score += 5
  }

  // 5. 消费趋势评分 (10分)
  const recentTrend = calculateSpendingTrend(expenses)
  if (recentTrend === 'stable') {
    score += 10
  } else if (recentTrend === 'decreasing') {
    score += 8
  } else if (recentTrend === 'increasing') {
    score += 3
  }

  // 确定评级
  let grade: HealthScore['grade']
  let color: string
  let bgColor: string
  let icon: string
  let description: string

  if (score >= 90) {
    grade = '优秀'
    color = 'text-green-600'
    bgColor = 'bg-green-50'
    icon = '🎯'
    description = '财务状况非常健康，继续保持！'
  } else if (score >= 70) {
    grade = '良好'
    color = 'text-blue-600'
    bgColor = 'bg-blue-50'
    icon = '✓'
    description = '财务状况良好，略有改进空间'
  } else if (score >= 50) {
    grade = '注意'
    color = 'text-yellow-600'
    bgColor = 'bg-yellow-50'
    icon = '⚠️'
    description = '需要注意控制消费，避免超支'
  } else {
    grade = '危险'
    color = 'text-red-600'
    bgColor = 'bg-red-50'
    icon = '❌'
    description = '财务风险较高，请立即调整消费'
  }

  return { score, grade, color, bgColor, icon, description }
}

// 计算消费趋势
function calculateSpendingTrend(expenses: Expense[]): 'increasing' | 'decreasing' | 'stable' {
  if (expenses.length < 7) return 'stable'

  const last7Days = expenses.filter(exp => {
    const expDate = new Date(exp.date)
    const now = new Date()
    const diff = now.getTime() - expDate.getTime()
    return diff <= 7 * 24 * 60 * 60 * 1000
  })

  const previous7Days = expenses.filter(exp => {
    const expDate = new Date(exp.date)
    const now = new Date()
    const diff = now.getTime() - expDate.getTime()
    return diff > 7 * 24 * 60 * 60 * 1000 && diff <= 14 * 24 * 60 * 60 * 1000
  })

  const lastWeekTotal = last7Days.reduce((sum, exp) => sum + toNumber(exp.amount), 0)
  const prevWeekTotal = previous7Days.reduce((sum, exp) => sum + toNumber(exp.amount), 0)

  if (prevWeekTotal === 0) return 'stable'

  const change = ((lastWeekTotal - prevWeekTotal) / prevWeekTotal) * 100

  if (change > 15) return 'increasing'
  if (change < -15) return 'decreasing'
  return 'stable'
}

// 趋势对比数据
export interface TrendData {
  value: number
  change: number  // 百分比
  direction: 'up' | 'down' | 'neutral'
  color: string
  icon: string
}

// 计算与昨天对比
export function compareWithYesterday(expenses: Expense[]): TrendData {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date)
    expDate.setHours(0, 0, 0, 0)
    return expDate.getTime() === today.getTime()
  })

  const yesterdayExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date)
    expDate.setHours(0, 0, 0, 0)
    return expDate.getTime() === yesterday.getTime()
  })

  const todayTotal = todayExpenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0)
  const yesterdayTotal = yesterdayExpenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0)

  const change = yesterdayTotal > 0
    ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
    : 0

  let direction: TrendData['direction'] = 'neutral'
  let color = 'text-slate-600'
  let icon = '→'

  if (change > 5) {
    direction = 'up'
    color = 'text-red-600'
    icon = '↑'
  } else if (change < -5) {
    direction = 'down'
    color = 'text-green-600'
    icon = '↓'
  }

  return {
    value: todayTotal || 0,
    change: Math.abs(change) || 0,
    direction,
    color,
    icon
  }
}

// 计算与上周对比
export function compareWithLastWeek(expenses: Expense[]): TrendData {
  const now = new Date()
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(thisWeekStart.getDate() - 7)

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const thisWeekExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date)
    return expDate >= thisWeekStart && expDate <= now
  })

  const lastWeekExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date)
    return expDate >= lastWeekStart && expDate < thisWeekStart
  })

  const thisWeekTotal = thisWeekExpenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0)
  const lastWeekTotal = lastWeekExpenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0)

  const change = lastWeekTotal > 0
    ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
    : 0

  let direction: TrendData['direction'] = 'neutral'
  let color = 'text-slate-600'
  let icon = '→'

  if (change > 5) {
    direction = 'up'
    color = 'text-orange-600'
    icon = '↑'
  } else if (change < -5) {
    direction = 'down'
    color = 'text-green-600'
    icon = '↓'
  }

  return {
    value: thisWeekTotal || 0,
    change: Math.abs(change) || 0,
    direction,
    color,
    icon
  }
}

// 智能建议系统
export interface SmartInsight {
  type: 'warning' | 'info' | 'success' | 'tip'
  icon: string
  message: string
  priority: number  // 数字越小优先级越高
}

export function generateSmartInsights(
  stats: FinanceStats,
  config: FinanceConfig,
  expenses: Expense[],
  reimbursements: Reimbursement[],
  tags: Tag[]
): SmartInsight[] {
  const insights: SmartInsight[] = []

  // 1. 餐饮支出检查
  const last30Days = expenses.filter(exp => {
    const expDate = new Date(exp.date)
    const now = new Date()
    const diff = now.getTime() - expDate.getTime()
    return diff <= 30 * 24 * 60 * 60 * 1000
  })

  // 查找餐饮/饮食标签
  const foodTag = tags.find(t => t.name === '饮食' || t.name === '餐饮')
  const foodExpenses = foodTag
    ? last30Days.filter(exp => exp.categoryTagId === foodTag.id)
    : []
  const foodTotal = foodExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
  const totalLast30Days = last30Days.reduce((sum, exp) => sum + Number(exp.amount), 0)
  const foodPercentage = totalLast30Days > 0 ? (foodTotal / totalLast30Days) * 100 : 0

  if (foodPercentage > 40 && foodTag) {
    insights.push({
      type: 'warning',
      icon: foodTag.icon || '🍜',
      message: `本月${foodTag.name}开销占比${Number(foodPercentage).toFixed(0)}%，建议适当减少外出就餐`,
      priority: 2
    })
  }

  // 2. 还款日提醒
  const daysUntilDue = Math.ceil(
    (new Date(config.creditDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysUntilDue <= 5 && daysUntilDue > 0) {
    insights.push({
      type: 'warning',
      icon: '⏰',
      message: `距离还款日还有${daysUntilDue}天，请确保账户有足够余额`,
      priority: 1
    })
  }

  // 3. 消费趋势预警
  const trend = calculateSpendingTrend(expenses)
  const weekComparison = compareWithLastWeek(expenses)

  if (trend === 'increasing' && weekComparison.change > 20) {
    insights.push({
      type: 'warning',
      icon: '📈',
      message: `本周消费比上周增加${Number(weekComparison.change).toFixed(0)}%，请注意控制`,
      priority: 2
    })
  }

  // 4. 待报销提醒
  const pendingReimbs = reimbursements.filter(r => r.status === 'pending')
  if (pendingReimbs.length > 0) {
    insights.push({
      type: 'info',
      icon: '💰',
      message: `您有${pendingReimbs.length}笔待报销，总计${Number(stats.pendingReimbursement).toFixed(2)}元，尽快提交`,
      priority: 3
    })
  }

  // 5. 健康状况良好
  if (stats.safeToSpend > 2000 && safeDivide(stats.totalSpent, config.creditLimit) < 0.5) {
    insights.push({
      type: 'success',
      icon: '✨',
      message: '财务状况健康，额度使用合理，继续保持！',
      priority: 5
    })
  }

  // 6. 超支警告
  if (stats.safeToSpend < 0) {
    insights.push({
      type: 'warning',
      icon: '🚨',
      message: `已超支${Number(Math.abs(stats.safeToSpend)).toFixed(2)}元，请立即停止消费！`,
      priority: 0
    })
  }

  // 7. 使用率过高
  const usageRate = safeDivide(toNumber(stats.totalSpent), toNumber(config.creditLimit)) * 100
  if (usageRate > 80) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      message: `信用使用率已达${usageRate.toFixed(0)}%，接近上限，请谨慎消费`,
      priority: 1
    })
  }

  // 8. 分类建议
  const categoryTags = tags.filter(t => t.type === 'category')
  const categoryStats = categoryTags.map(tag => {
    const catExpenses = last30Days.filter(e => e.categoryTagId === tag.id)
    const amount = catExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const percentage = totalLast30Days > 0 ? (amount / totalLast30Days) * 100 : 0
    return { tag, amount, percentage }
  }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)

  if (categoryStats.length > 0 && categoryStats[0].percentage > 35) {
    const topCategory = categoryStats[0]
    insights.push({
      type: 'tip',
      icon: topCategory.tag.icon || '📊',
      message: `${topCategory.tag.name}是您最大开销项(${Number(topCategory.percentage).toFixed(0)}%)，可考虑优化`,
      priority: 4
    })
  }

  // 按优先级排序
  return insights.sort((a, b) => a.priority - b.priority).slice(0, 4)
}
