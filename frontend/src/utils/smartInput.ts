import type { Expense, ExpenseTemplate } from '@/store/types'
import { toNumber, safeDivide } from './formatters'

/**
 * 智能描述自动补全
 */
export function getDescriptionSuggestions(
  input: string,
  expenses: Expense[],
  limit: number = 5
): string[] {
  if (!input || input.length < 1) return []

  const inputLower = input.toLowerCase().trim()

  // 统计所有描述的出现次数
  const descriptionCounts: Record<string, number> = {}
  expenses.forEach(exp => {
    const desc = exp.description.trim()
    descriptionCounts[desc] = (descriptionCounts[desc] || 0) + 1
  })

  // 筛选匹配的描述并按出现次数排序
  const matches = Object.entries(descriptionCounts)
    .filter(([desc]) => desc.toLowerCase().includes(inputLower))
    .sort((a, b) => b[1] - a[1])
    .map(([desc]) => desc)
    .slice(0, limit)

  return matches
}

/**
 * 智能金额推荐
 */
export function getAmountRecommendations(
  description: string,
  category: string,
  expenses: Expense[]
): { min: number; max: number; avg: number; mode: number } | null {
  const relevantExpenses = expenses.filter(
    exp =>
      (exp.description.toLowerCase().includes(description.toLowerCase()) ||
       exp.category === category) &&
      exp.amount > 0
  )

  if (relevantExpenses.length < 3) return null

  const amounts = relevantExpenses.map(e => e.amount).sort((a, b) => a - b)
  const min = amounts[0]
  const max = amounts[amounts.length - 1]
  const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length

  // 计算众数（最常见的金额）
  const amountCounts: Record<number, number> = {}
  amounts.forEach(amount => {
    const rounded = Math.round(amount / 10) * 10 // 四舍五入到10
    amountCounts[rounded] = (amountCounts[rounded] || 0) + 1
  })
  const mode = Number(
    Object.entries(amountCounts)
      .sort((a, b) => b[1] - a[1])[0][0]
  )

  return { min, max, avg, mode }
}

/**
 * 智能类别推荐
 */
export function getCategoryRecommendation(
  description: string,
  expenses: Expense[]
): string | null {
  const descLower = description.toLowerCase().trim()
  if (!descLower) return null

  // 查找相似描述的类别
  const categoryCounts: Record<string, number> = {}
  expenses.forEach(exp => {
    if (exp.description.toLowerCase().includes(descLower) ||
        descLower.includes(exp.description.toLowerCase().substring(0, 3))) {
      categoryCounts[exp.category] = (categoryCounts[exp.category] || 0) + 1
    }
  })

  if (Object.keys(categoryCounts).length === 0) return null

  // 返回最常见的类别
  return Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * 从描述中提取可能的金额
 */
export function extractAmountFromDescription(description: string): number | null {
  // 匹配如"20元"、"¥50"、"100块"等
  const patterns = [
    /¥(\d+(?:\.\d{1,2})?)/,
    /(\d+(?:\.\d{1,2})?)[元块]/,
    /(\d+(?:\.\d{1,2})?)\s*rmb/i,
  ]

  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match) {
      return parseFloat(match[1])
    }
  }

  return null
}

/**
 * 智能标签推荐
 */
export function getTagRecommendations(
  category: string,
  description: string,
  expenses: Expense[],
  limit: number = 5
): string[] {
  const tagCounts: Record<string, number> = {}

  // 找出相似支出的标签
  expenses.forEach(exp => {
    if (
      (exp.category === category ||
       exp.description.toLowerCase().includes(description.toLowerCase())) &&
      exp.tags && exp.tags.length > 0
    ) {
      exp.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    }
  })

  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag)
}

/**
 * 生成快速输入建议
 */
export function generateQuickInputSuggestions(
  expenses: Expense[],
  templates: ExpenseTemplate[]
): Array<{
  type: 'template' | 'recent' | 'frequent'
  label: string
  data: Partial<Expense> | ExpenseTemplate
}> {
  const suggestions: Array<{
    type: 'template' | 'recent' | 'frequent'
    label: string
    data: Partial<Expense> | ExpenseTemplate
  }> = []

  // 添加模板
  templates.forEach(template => {
    suggestions.push({
      type: 'template',
      label: `模板: ${template.name}`,
      data: template
    })
  })

  // 最近3笔
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  recentExpenses.forEach(exp => {
    suggestions.push({
      type: 'recent',
      label: `最近: ${exp.description}`,
      data: {
        category: exp.category,
        amount: exp.amount,
        description: exp.description,
        tags: exp.tags
      }
    })
  })

  // 高频支出（最近30天）
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentExpensesList = expenses.filter(
    e => new Date(e.date) >= thirtyDaysAgo
  )

  const descriptionCounts: Record<string, { count: number; expense: Expense }> = {}
  recentExpensesList.forEach(exp => {
    const key = `${exp.category}_${exp.description}`
    if (!descriptionCounts[key]) {
      descriptionCounts[key] = { count: 0, expense: exp }
    }
    descriptionCounts[key].count++
  })

  const frequentExpenses = Object.values(descriptionCounts)
    .filter(item => item.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  frequentExpenses.forEach(item => {
    suggestions.push({
      type: 'frequent',
      label: `常用: ${item.expense.description} (${item.count}次)`,
      data: {
        category: item.expense.category,
        amount: item.expense.amount,
        description: item.expense.description,
        tags: item.expense.tags
      }
    })
  })

  return suggestions
}

/**
 * 智能检测周期性支出
 */
export function detectPotentialRecurring(expenses: Expense[]): Array<{
  description: string
  category: string
  amount: number
  frequency: 'weekly' | 'monthly'
  dayOfWeek?: number
  dayOfMonth?: number
  confidence: number
}> {
  const results: Array<{
    description: string
    category: string
    amount: number
    frequency: 'weekly' | 'monthly'
    dayOfWeek?: number
    dayOfMonth?: number
    confidence: number
  }> = []

  // 按描述和金额范围分组
  const groups: Record<string, Expense[]> = {}
  expenses.forEach(exp => {
    const amountRange = Math.floor(exp.amount / 50) * 50
    const key = `${exp.description}_${amountRange}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(exp)
  })

  Object.entries(groups).forEach(([_key, exps]) => {
    if (exps.length < 3) return

    // 检查日期间隔
    const dates = exps.map(e => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime())
    const intervals: number[] = []
    for (let i = 1; i < dates.length; i++) {
      const days = Math.floor((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24))
      intervals.push(days)
    }

    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length
    const stdDev = Math.sqrt(
      intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length
    )

    // 如果间隔比较稳定
    if (stdDev < avgInterval * 0.3) {
      let frequency: 'weekly' | 'monthly' | null = null
      let dayOfWeek: number | undefined
      let dayOfMonth: number | undefined
      let confidence = 0

      // 判断是每周还是每月
      if (avgInterval >= 5 && avgInterval <= 9) {
        frequency = 'weekly'
        // 计算最常见的星期几
        const weekdays = dates.map(d => d.getDay())
        const weekdayCounts: Record<number, number> = {}
        weekdays.forEach(wd => {
          weekdayCounts[wd] = (weekdayCounts[wd] || 0) + 1
        })
        dayOfWeek = Number(
          Object.entries(weekdayCounts)
            .sort((a, b) => b[1] - a[1])[0][0]
        )
        confidence = safeDivide(weekdayCounts[dayOfWeek], weekdays.length) * 100
      } else if (avgInterval >= 25 && avgInterval <= 35) {
        frequency = 'monthly'
        // 计算最常见的日期
        const monthDays = dates.map(d => d.getDate())
        const daysCounts: Record<number, number> = {}
        monthDays.forEach(md => {
          daysCounts[md] = (daysCounts[md] || 0) + 1
        })
        dayOfMonth = Number(
          Object.entries(daysCounts)
            .sort((a, b) => b[1] - a[1])[0][0]
        )
        confidence = safeDivide(daysCounts[dayOfMonth], monthDays.length) * 100
      }

      if (frequency && confidence > 60) {
        const avgAmount = safeDivide(exps.reduce((sum, e) => sum + toNumber(e.amount), 0), exps.length)
        results.push({
          description: exps[0].description,
          category: exps[0].category,
          amount: Math.round(avgAmount),
          frequency,
          dayOfWeek,
          dayOfMonth,
          confidence
        })
      }
    }
  })

  return results.sort((a, b) => b.confidence - a.confidence)
}
