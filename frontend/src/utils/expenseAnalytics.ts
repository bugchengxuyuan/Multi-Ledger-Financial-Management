import type { Expense, AnomalyDetection, ConsumptionHabit, Tag } from '@/store/types'

/**
 * 异常检测 - 检测大额支出
 */
export function detectLargeAmount(expenses: Expense[]): AnomalyDetection[] {
  const results: AnomalyDetection[] = []

  if (expenses.length < 3) return results

  // 计算平均值和标准差
  const amounts = expenses.map(e => Number(e.amount))
  const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
  const threshold = avg * 2 // 超过平均值2倍

  expenses.forEach(expense => {
    const expAmount = Number(expense.amount)
    if (expAmount > threshold) {
      results.push({
        id: `anomaly_${expense.id}`,
        type: 'large_amount',
        severity: expAmount > avg * 3 ? 'high' : 'medium',
        message: `检测到大额支出：${expense.description}，金额¥${expAmount}，超过平均值${((expAmount / avg - 1) * 100).toFixed(0)}%`,
        expenseId: expense.id,
        amount: expAmount,
        date: expense.date,
        suggestions: [
          '确认这笔支出是否必要',
          '考虑是否可以分期支付',
          '检查是否有更优惠的选择'
        ]
      })
    }
  })

  return results
}

/**
 * 异常检测 - 检测某类支出异常增长
 */
export function detectUnusualIncrease(expenses: Expense[], tags: Tag[]): AnomalyDetection[] {
  const results: AnomalyDetection[] = []

  const now = new Date()
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - 7)
  thisWeekStart.setHours(0, 0, 0, 0)

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  // 按类别分组（使用categoryTagId）
  const categoryTagIds = [...new Set(expenses.map(e => e.categoryTagId))]

  categoryTagIds.forEach(categoryTagId => {
    const thisWeek = expenses.filter(e => {
      const date = new Date(e.date)
      return e.categoryTagId === categoryTagId && date >= thisWeekStart
    }).reduce((sum, e) => sum + Number(e.amount), 0)

    const lastWeek = expenses.filter(e => {
      const date = new Date(e.date)
      return e.categoryTagId === categoryTagId && date >= lastWeekStart && date < thisWeekStart
    }).reduce((sum, e) => sum + Number(e.amount), 0)

    if (lastWeek > 0 && thisWeek > lastWeek * 1.5) {
      const increasePercent = ((thisWeek / lastWeek - 1) * 100).toFixed(0)
      const categoryTag = tags.find(t => t.id === categoryTagId)
      const categoryName = categoryTag?.name || '未知分类'

      results.push({
        id: `anomaly_increase_${categoryTagId}`,
        type: 'unusual_increase',
        severity: thisWeek > lastWeek * 2 ? 'high' : 'medium',
        message: `${categoryName}支出本周比上周增长${increasePercent}%（上周¥${Number(lastWeek).toFixed(0)}，本周¥${Number(thisWeek).toFixed(0)}）`,
        category: categoryName,
        date: now.toISOString(),
        suggestions: [
          '检查是否有不必要的消费',
          '考虑设置该类别预算限制',
          '分析增长原因是否合理'
        ]
      })
    }
  })

  return results
}

/**
 * 异常检测 - 深夜消费提醒
 */
export function detectLateNightExpenses(expenses: Expense[]): AnomalyDetection[] {
  const results: AnomalyDetection[] = []

  // 最近7天的深夜消费（假设22:00-6:00为深夜）
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)

  const recentExpenses = expenses.filter(e => new Date(e.date) >= sevenDaysAgo)
  const lateNightCount = recentExpenses.filter(e => {
    const hour = new Date(e.createdAt || e.date).getHours()
    return hour >= 22 || hour < 6
  }).length

  if (lateNightCount > 3) {
    results.push({
      id: 'anomaly_late_night',
      type: 'late_night',
      severity: 'low',
      message: `最近7天有${lateNightCount}笔深夜消费，注意休息和冲动消费`,
      date: now.toISOString(),
      suggestions: [
        '避免深夜网购，容易冲动消费',
        '设置消费冷静期',
        '建立健康的作息习惯'
      ]
    })
  }

  return results
}

/**
 * 消费习惯分析 - 高频支出识别
 */
export function analyzeHighFrequencyExpenses(expenses: Expense[], tags: Tag[]): ConsumptionHabit[] {
  const habits: ConsumptionHabit[] = []

  // 最近30天
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  const recentExpenses = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo)

  // 按描述分组，找出高频支出
  const descriptionGroups: Record<string, Expense[]> = {}
  recentExpenses.forEach(expense => {
    const key = expense.description.toLowerCase().trim()
    if (!descriptionGroups[key]) {
      descriptionGroups[key] = []
    }
    descriptionGroups[key].push(expense)
  })

  Object.entries(descriptionGroups).forEach(([desc, exps]) => {
    if (exps.length >= 5) {
      const avgAmount = exps.reduce((sum, e) => sum + Number(e.amount), 0) / exps.length
      const frequency = (exps.length / 30) * 7 // 每周次数
      const categoryTag = tags.find(t => t.id === exps[0].categoryTagId)
      const categoryName = categoryTag?.name || '未知分类'

      habits.push({
        type: 'high_frequency',
        category: categoryName,
        description: `经常在"${desc}"消费，最近30天${exps.length}次`,
        frequency,
        averageAmount: avgAmount,
        pattern: `平均每周${Number(frequency).toFixed(1)}次，单次约¥${Number(avgAmount).toFixed(0)}`,
        suggestion: frequency > 5
          ? '频率较高，考虑办理会员或寻找优惠'
          : '可考虑设置每月预算'
      })
    }
  })

  return habits
}

/**
 * 消费习惯分析 - 周期性支出识别
 */
export function analyzePeriodicExpenses(expenses: Expense[], tags: Tag[]): ConsumptionHabit[] {
  const habits: ConsumptionHabit[] = []

  // 分析最近6个月的数据
  const now = new Date()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(now.getMonth() - 6)

  const recentExpenses = expenses.filter(e => new Date(e.date) >= sixMonthsAgo)

  // 按类别和金额区间分组
  const categoryAmountGroups: Record<string, Expense[]> = {}
  recentExpenses.forEach(expense => {
    const amountRange = Math.floor(expense.amount / 100) * 100
    const key = `${expense.categoryTagId}_${amountRange}`
    if (!categoryAmountGroups[key]) {
      categoryAmountGroups[key] = []
    }
    categoryAmountGroups[key].push(expense)
  })

  Object.entries(categoryAmountGroups).forEach(([key, exps]) => {
    if (exps.length >= 3) {
      // 检查是否有周期性
      const dates = exps.map(e => new Date(e.date).getDate()).sort((a, b) => a - b)
      const intervals: number[] = []
      for (let i = 1; i < dates.length; i++) {
        intervals.push(Math.abs(dates[i] - dates[i - 1]))
      }

      const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length

      if (avgInterval >= 25 && avgInterval <= 35) {
        const [categoryTagId] = key.split('_')
        const avgAmount = exps.reduce((sum, e) => sum + Number(e.amount), 0) / exps.length
        const categoryTag = tags.find(t => t.id === categoryTagId)
        const categoryName = categoryTag?.name || '未知分类'

        habits.push({
          type: 'periodic',
          category: categoryName,
          description: `${categoryName}类支出可能是每月固定开支`,
          frequency: 1,
          averageAmount: avgAmount,
          pattern: `约每月${Math.round(avgInterval)}号，金额约¥${Number(avgAmount).toFixed(0)}`,
          suggestion: '可设置为周期性支出，自动记录'
        })
      }
    }
  })

  return habits
}

/**
 * 消费时段分析
 */
export function analyzeTimePattern(expenses: Expense[]): ConsumptionHabit[] {
  const habits: ConsumptionHabit[] = []

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  const recentExpenses = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo)

  // 工作日 vs 周末
  const weekdayExpenses = recentExpenses.filter(e => {
    const day = new Date(e.date).getDay()
    return day >= 1 && day <= 5
  })

  const weekendExpenses = recentExpenses.filter(e => {
    const day = new Date(e.date).getDay()
    return day === 0 || day === 6
  })

  if (weekdayExpenses.length > 0 && weekendExpenses.length > 0) {
    const weekdayAvg = weekdayExpenses.reduce((sum, e) => sum + Number(e.amount), 0) / weekdayExpenses.length
    const weekendAvg = weekendExpenses.reduce((sum, e) => sum + Number(e.amount), 0) / weekendExpenses.length

    if (weekendAvg > weekdayAvg * 1.5) {
      habits.push({
        type: 'time_pattern',
        category: '全部',
        description: '周末消费明显高于工作日',
        frequency: 2,
        averageAmount: weekendAvg,
        pattern: `周末单笔¥${Number(weekendAvg).toFixed(0)}，工作日¥${Number(weekdayAvg).toFixed(0)}`,
        suggestion: '周末消费需注意控制，可设置周末预算'
      })
    }
  }

  return habits
}

/**
 * 综合异常检测
 */
export function detectAllAnomalies(expenses: Expense[]): AnomalyDetection[] {
  return [
    ...detectLargeAmount(expenses),
    ...detectUnusualIncrease(expenses),
    ...detectLateNightExpenses(expenses)
  ].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

/**
 * 综合消费习惯分析
 */
export function analyzeAllHabits(expenses: Expense[]): ConsumptionHabit[] {
  return [
    ...analyzeHighFrequencyExpenses(expenses),
    ...analyzePeriodicExpenses(expenses),
    ...analyzeTimePattern(expenses)
  ]
}
