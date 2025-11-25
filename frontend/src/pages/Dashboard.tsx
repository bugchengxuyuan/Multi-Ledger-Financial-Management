import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Wallet, Clock, DollarSign, AlertTriangle, TrendingUp, Receipt, Calculator, CheckCircle, XCircle, Calendar, Download, PieChart as PieChartIcon, Activity, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { formatCurrency, formatDate, toNumber, safeDivide } from '@/utils/formatters'
import { daysUntil } from '@/utils/calculations'
import { exportAllData, exportAllDataToExcel, exportAllDataToPDF } from '@/utils/exportData'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { calculateHealthScore, compareWithYesterday, compareWithLastWeek, generateSmartInsights } from '@/utils/insights'
import { transactionToExpense, transactionToReimbursement, transactionToInvestment } from '@/store/types'
import { AccountBookSelector } from '@/components/AccountBookSelector'
import { BalanceCard } from '@/components/BalanceCard'

export default function Dashboard() {
  const { stats, config, transactions, expenses, reimbursements, investments, tags, loadTransactions, selectedAccountBookId } = useFinanceStore()
  const [checkAmount, setCheckAmount] = useState('')
  const [checkResult, setCheckResult] = useState<{ safe: boolean; remaining: number } | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // 使用统一的交易数据并转换为旧格式以保持兼容性
  const expensesFromTransactions = useMemo(() => {
    let result = []
    if (transactions && transactions.length > 0) {
      // 如果有统一交易数据，使用它
      result = transactions
        .filter(t => t.type === 'expense')
        .map(t => transactionToExpense(t))
    } else {
      // 否则使用旧的expenses数据
      result = expenses || []
    }

    // 按账本筛选
    if (selectedAccountBookId) {
      return result.filter(e => e.accountBookId === selectedAccountBookId)
    }
    return result
  }, [transactions, expenses, selectedAccountBookId])

  const reimbursementsFromTransactions = useMemo(() => {
    let result = reimbursements || []

    // 按账本筛选（通过关联的交易或支出）
    if (selectedAccountBookId) {
      return result.filter(r => {
        // 检查关联的交易
        if (r.transactionId) {
          const transaction = transactions?.find(t => t.id === r.transactionId)
          return transaction?.accountBookId === selectedAccountBookId
        }
        // 检查关联的支出
        if (r.expenseId) {
          const expense = expenses?.find(e => e.id === r.expenseId)
          return expense?.accountBookId === selectedAccountBookId
        }
        return false
      })
    }
    return result
  }, [transactions, reimbursements, expenses, selectedAccountBookId])

  const investmentsFromTransactions = useMemo(() => {
    let result = []
    if (transactions && transactions.length > 0) {
      // 如果有统一交易数据，使用它
      result = transactions
        .filter(t => t.type === 'investment')
        .map(t => transactionToInvestment(t))
    } else {
      // 否则使用旧的investments数据
      result = investments || []
    }

    // 按账本筛选
    if (selectedAccountBookId) {
      return result.filter(i => i.accountBookId === selectedAccountBookId)
    }
    return result
  }, [transactions, investments, selectedAccountBookId])

  // 使用转换后的数据
  const effectiveExpenses = expensesFromTransactions
  const effectiveReimbursements = reimbursementsFromTransactions
  const effectiveInvestments = investmentsFromTransactions

  // 加载统一交易数据
  useEffect(() => {
    if (loadTransactions) {
      loadTransactions()
    }
  }, [loadTransactions])

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (format === 'csv') {
      exportAllData(effectiveExpenses, effectiveReimbursements, effectiveInvestments, stats)
    } else if (format === 'excel') {
      exportAllDataToExcel(effectiveExpenses, effectiveReimbursements, effectiveInvestments, stats)
    } else if (format === 'pdf') {
      exportAllDataToPDF(effectiveExpenses, effectiveReimbursements, effectiveInvestments, stats)
    }
    setShowExportMenu(false)
  }

  if (!stats || !config) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 dark:border-violet-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">加载中...</p>
        </div>
      </div>
    )
  }

  const daysUntilSalary = daysUntil(config.salaryDate)
  const daysUntilDue = daysUntil(config.creditDueDate)

  // 计算今日预算
  const dailyBudget = daysUntilSalary > 0 ? safeDivide(stats.safeToSpend, daysUntilSalary) : stats.safeToSpend

  // 计算今天已花金额
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayExpenses = effectiveExpenses.filter(exp => {
    const expDate = new Date(exp.date)
    expDate.setHours(0, 0, 0, 0)
    return expDate.getTime() === today.getTime()
  })
  const todaySpent = todayExpenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0)
  const todayRemaining = dailyBudget - todaySpent

  // 财务健康评分
  const healthScore = useMemo(() =>
    calculateHealthScore(stats, config, effectiveExpenses),
    [stats, config, effectiveExpenses]
  )

  // 趋势对比数据
  const yesterdayTrend = useMemo(() =>
    compareWithYesterday(effectiveExpenses),
    [effectiveExpenses]
  )

  const weekTrend = useMemo(() =>
    compareWithLastWeek(effectiveExpenses),
    [effectiveExpenses]
  )

  // 智能建议
  const smartInsights = useMemo(() =>
    generateSmartInsights(stats, config, effectiveExpenses, effectiveReimbursements, tags),
    [stats, config, effectiveExpenses, effectiveReimbursements, tags]
  )

  // 信用额度使用率数据（环形图）
  const creditUsageData = useMemo(() => {
    return [
      { name: '已使用', value: stats.totalSpent, color: '#ef4444' },
      { name: '剩余额度', value: stats.availableCredit, color: '#22c55e' }
    ]
  }, [stats.totalSpent, stats.availableCredit])

  // 近30天消费趋势数据
  const last30DaysTrend = useMemo(() => {
    const data = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const dayExpenses = effectiveExpenses.filter(exp => {
        const expDate = new Date(exp.date)
        expDate.setHours(0, 0, 0, 0)
        return expDate.getTime() === date.getTime()
      })

      data.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        amount: dayExpenses.reduce((sum, e) => sum + toNumber(e.amount), 0),
        count: dayExpenses.length
      })
    }
    return data
  }, [effectiveExpenses])

  // 消费前检查
  const handleCheckExpense = () => {
    const amount = parseFloat(checkAmount)
    if (isNaN(amount) || amount <= 0) {
      setCheckResult(null)
      return
    }
    const remaining = stats.safeToSpend - amount
    setCheckResult({
      safe: remaining >= 0,
      remaining: remaining
    })
  }

  // 趋势指示器组件
  const TrendIndicator = ({ trend }: { trend: { direction: 'up' | 'down' | 'neutral'; change: number; color: string; icon: string } }) => {
    const Icon = trend.direction === 'up' ? ArrowUp : trend.direction === 'down' ? ArrowDown : Minus
    return (
      <div className={`flex items-center gap-1 ${trend.color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-semibold">{(trend.change || 0).toFixed(1)}%</span>
      </div>
    )
  }

  // 建议类型样式映射
  const insightStyles = {
    warning: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border-amber-200 dark:border-amber-700 backdrop-blur-sm',
    info: 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 border-cyan-200 dark:border-cyan-700 backdrop-blur-sm',
    success: 'bg-gradient-to-br from-emerald-600/10 to-green-600/10 dark:from-emerald-600/20 dark:to-green-600/20 border-emerald-200 dark:border-emerald-700 backdrop-blur-sm',
    tip: 'bg-gradient-to-br from-violet-600/10 to-indigo-600/10 dark:from-violet-600/20 dark:to-indigo-600/20 border-violet-200 dark:border-violet-700 backdrop-blur-sm',
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
            财务仪表盘
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {formatDate(new Date().toISOString())}
          </p>
        </div>
        <div className="relative">
          <Button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">导出数据</span>
          </Button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border border-violet-200 dark:border-violet-700 rounded-lg shadow-2xl z-10 overflow-hidden">
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2 hover:bg-gradient-to-r hover:from-violet-600/10 hover:to-indigo-600/10 dark:hover:from-violet-500/20 dark:hover:to-indigo-500/20 rounded-t-lg text-sm text-slate-700 dark:text-slate-300 transition-all duration-200"
              >
                导出为 CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2 hover:bg-gradient-to-r hover:from-violet-600/10 hover:to-indigo-600/10 dark:hover:from-violet-500/20 dark:hover:to-indigo-500/20 text-sm text-slate-700 dark:text-slate-300 transition-all duration-200"
              >
                导出为 Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2 hover:bg-gradient-to-r hover:from-violet-600/10 hover:to-indigo-600/10 dark:hover:from-violet-500/20 dark:hover:to-indigo-500/20 rounded-b-lg text-sm text-slate-700 dark:text-slate-300 transition-all duration-200"
              >
                导出为 PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 账本选择器和余额卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-1">
          <AccountBookSelector className="w-full" />
        </div>
        <div className="md:col-span-2">
          <BalanceCard accountBookId={selectedAccountBookId} />
        </div>
      </div>

      {/* Hero Card - 财务健康评分 */}
      <Card className={`border-2 ${healthScore.bgColor} shadow-2xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm transition-all duration-300 hover:shadow-3xl hover:-translate-y-1 animate-in slide-in-from-bottom duration-700`}>
        <CardContent className="pt-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：健康评分 */}
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                <span className="text-4xl">{healthScore.icon}</span>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">财务健康度</div>
                  <div className={`text-2xl font-bold ${healthScore.color}`}>{healthScore.grade}</div>
                </div>
              </div>
              <div className={`text-7xl md:text-8xl font-bold bg-gradient-to-br ${healthScore.color.includes('green') ? 'from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400' : healthScore.color.includes('yellow') ? 'from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400' : 'from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400'} bg-clip-text text-transparent mb-2`}>
                {healthScore.score || 0}
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-sm">{healthScore.description}</div>
            </div>

            {/* 中间：安全可花金额 */}
            <div className="text-center border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-6 lg:pt-0 lg:pl-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Wallet className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">安全可花</span>
              </div>
              <div className={`text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-br ${stats.safeToSpend >= 0 ? 'from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400' : 'from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400'} bg-clip-text text-transparent`}>
                {formatCurrency(stats.safeToSpend)}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">vs 昨天</span>
                <TrendIndicator trend={yesterdayTrend} />
              </div>
            </div>

            {/* 右侧：关键指标 */}
            <div className="grid grid-cols-2 gap-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-6 lg:pt-0 lg:pl-6">
              <div className="text-center">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">还剩天数</div>
                <div className="text-3xl font-bold bg-gradient-to-br from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">{daysUntilSalary || 0}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">天</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">日均预算</div>
                <div className="text-3xl font-bold bg-gradient-to-br from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">{formatCurrency(Math.max(0, dailyBudget))}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">每天</div>
              </div>
              <div className="text-center col-span-2">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">今日剩余预算</div>
                <div className={`text-3xl font-bold bg-gradient-to-br ${todayRemaining >= 0 ? 'from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400' : 'from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400'} bg-clip-text text-transparent`}>
                  {formatCurrency(todayRemaining)}
                </div>
                <div className="relative mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, safeDivide(todaySpent, dailyBudget) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 智能建议 */}
      {smartInsights.length > 0 && (
        <div className="space-y-3 animate-in slide-in-from-bottom duration-700 delay-100">
          <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
            <span>💡</span>
            智能建议
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {smartInsights.map((insight, index) => (
              <Alert key={index} className={`${insightStyles[insight.type]} border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
                <AlertDescription className="flex items-start gap-2">
                  <span className="text-xl flex-shrink-0">{insight.icon}</span>
                  <span className="text-slate-800 dark:text-slate-200">{insight.message}</span>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom duration-700 delay-200">
        {/* 今日消费 */}
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 backdrop-blur-sm border-2 border-cyan-200 dark:border-cyan-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">今日消费</span>
              </div>
              <TrendIndicator trend={yesterdayTrend} />
            </div>
            <div className="text-4xl font-bold bg-gradient-to-br from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent mb-1">
              {formatCurrency(todaySpent)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              昨天 {formatCurrency(yesterdayTrend.value)}
            </div>
          </CardContent>
        </Card>

        {/* 本周消费 */}
        <Card className="bg-gradient-to-br from-violet-600/10 to-indigo-600/10 dark:from-violet-600/20 dark:to-indigo-600/20 backdrop-blur-sm border-2 border-violet-200 dark:border-violet-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">本周消费</span>
              </div>
              <TrendIndicator trend={weekTrend} />
            </div>
            <div className="text-4xl font-bold bg-gradient-to-br from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1">
              {formatCurrency(weekTrend.value)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              上周 {formatCurrency(safeDivide(weekTrend.value, (1 + weekTrend.change / 100)))}
            </div>
          </CardContent>
        </Card>

        {/* 待报销金额 */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 backdrop-blur-sm border-2 border-amber-200 dark:border-amber-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">待报销</span>
            </div>
            <div className="text-4xl font-bold bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent mb-1">
              {formatCurrency(stats.pendingReimbursement)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {effectiveReimbursements.filter(r => r.status === 'pending').length} 笔待处理
            </div>
          </CardContent>
        </Card>

        {/* 信用额度使用率 */}
        <Card className="bg-gradient-to-br from-rose-600/10 to-red-600/10 dark:from-rose-600/20 dark:to-red-600/20 backdrop-blur-sm border-2 border-rose-200 dark:border-rose-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">信用使用率</span>
            </div>
            <div className="text-4xl font-bold bg-gradient-to-br from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400 bg-clip-text text-transparent mb-1">
              {((safeDivide(stats.totalSpent, config.creditLimit) * 100) || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              已用 {formatCurrency(stats.totalSpent)} / {formatCurrency(config.creditLimit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 消费前检查器 */}
      <Card className="bg-gradient-to-br from-violet-600/10 to-indigo-600/10 dark:from-violet-600/20 dark:to-indigo-600/20 backdrop-blur-sm border-2 border-violet-200 dark:border-violet-700 shadow-lg transition-all duration-300 hover:shadow-xl animate-in slide-in-from-bottom duration-700 delay-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
            <Calculator className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            消费前检查
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="我想花多少钱？"
                value={checkAmount}
                onChange={(e) => setCheckAmount(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCheckExpense()}
                className="flex-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-violet-200 dark:border-violet-700 focus:border-violet-600 dark:focus:border-violet-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <Button
                onClick={handleCheckExpense}
                className="px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                检查
              </Button>
            </div>
            {checkResult && (
              <div className={`p-3 rounded-lg backdrop-blur-sm border transition-all duration-300 animate-in slide-in-from-top ${checkResult.safe ? 'bg-gradient-to-br from-emerald-600/10 to-green-600/10 dark:from-emerald-600/20 dark:to-green-600/20 border-emerald-200 dark:border-emerald-700' : 'bg-gradient-to-br from-rose-600/10 to-red-600/10 dark:from-rose-600/20 dark:to-red-600/20 border-rose-200 dark:border-rose-700'}`}>
                <div className="flex items-center gap-2">
                  {checkResult.safe ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div className="font-semibold text-emerald-800 dark:text-emerald-300">可以花！</div>
                        <div className="text-sm text-emerald-700 dark:text-emerald-400">
                          花 {formatCurrency(parseFloat(checkAmount))} 后还剩 {formatCurrency(checkResult.remaining)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      <div>
                        <div className="font-semibold text-rose-800 dark:text-rose-300">超支警告！</div>
                        <div className="text-sm text-rose-700 dark:text-rose-400">
                          会超支 {formatCurrency(Math.abs(checkResult.remaining))}，不建议消费
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 数据可视化区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 animate-in slide-in-from-bottom duration-700 delay-400">
        {/* 信用额度使用率环形图 */}
        <Card className="bg-gradient-to-br from-violet-600/10 to-indigo-600/10 dark:from-violet-600/20 dark:to-indigo-600/20 backdrop-blur-sm border-2 border-violet-200 dark:border-violet-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
              <PieChartIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              信用额度使用率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={creditUsageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {creditUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-600 to-red-600 dark:from-rose-500 dark:to-red-500"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">已使用</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(stats.totalSpent)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-600 to-green-600 dark:from-emerald-500 dark:to-green-500"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">剩余额度</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(stats.availableCredit)}</span>
                </div>
                <div className="pt-3 border-t border-violet-200 dark:border-violet-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">使用率</span>
                    <span className="font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                      {((safeDivide(stats.totalSpent, config.creditLimit) * 100) || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 近30天消费趋势图 */}
        <Card className="bg-gradient-to-br from-emerald-600/10 to-green-600/10 dark:from-emerald-600/20 dark:to-green-600/20 backdrop-blur-sm border-2 border-emerald-200 dark:border-emerald-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              近30天消费趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last30DaysTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `¥${value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value)}`, '消费金额']}
                    labelFormatter={(label) => `日期: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="url(#colorGradient)"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 6, fill: '#10b981' }}
                    name="消费金额"
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 倒计时卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-in slide-in-from-bottom duration-700 delay-500">
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">信用还款</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-br from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">{daysUntilDue || 0}天</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{config.creditDueDate}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">工资到账</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-br from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">{daysUntilSalary || 0}天</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatCurrency(config.salary)}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">剩余投资额</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-br from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">{formatCurrency(stats.remainingInvestment)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">可投资金额</div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">已投资</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">{formatCurrency(stats.totalInvestment)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">总投资金额</div>
          </CardContent>
        </Card>
      </div>

      {/* 警告提示 */}
      {stats.safeToSpend < 0 && (
        <Alert className="bg-gradient-to-br from-rose-600/10 to-red-600/10 dark:from-rose-600/20 dark:to-red-600/20 backdrop-blur-sm border-2 border-rose-200 dark:border-rose-700 shadow-lg animate-in slide-in-from-bottom duration-700 delay-600">
          <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <AlertDescription className="text-rose-800 dark:text-rose-300">
            <span className="font-semibold">资金危机！</span>
            <br />
            已超支 {formatCurrency(Math.abs(stats.safeToSpend))}，请立即停止消费！
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
