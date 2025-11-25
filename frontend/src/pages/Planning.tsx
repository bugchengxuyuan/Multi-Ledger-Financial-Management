import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, DollarSign, TrendingDown, AlertCircle } from 'lucide-react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { formatCurrency, formatDate, toNumber, safeDivide } from '@/utils/formatters'
import { daysUntil } from '@/utils/calculations'

export default function Planning() {
  const { stats, config, expenses } = useFinanceStore()

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

  const daysToSalary = daysUntil(config.salaryDate)
  const daysToDue = daysUntil(config.creditDueDate)
  const dailyBudget = safeDivide(stats.safeToSpend, daysToSalary)
  const usageRate = safeDivide(stats.totalSpent, config.creditLimit) * 100

  // 计算最近7天支出
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentExpenses = expenses.filter(exp =>
    new Date(exp.date) >= sevenDaysAgo
  )
  const recentTotal = recentExpenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0)
  const dailyAverage = recentTotal / 7

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto pb-20 md:pb-6 animate-in fade-in duration-500">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
          财务规划
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">智能规划，合理消费</p>
      </div>

      {/* 时间线 */}
      <Card className="border-2 border-violet-200 dark:border-violet-700 bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom duration-700">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
            <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            关键时间节点
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 backdrop-blur-sm border-2 border-cyan-200 dark:border-cyan-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div>
              <div className="font-medium text-cyan-900 dark:text-cyan-100">工资到账</div>
              <div className="text-sm text-cyan-700 dark:text-cyan-300">{formatDate(config.salaryDate)}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">{daysToSalary}</div>
              <div className="text-xs text-cyan-700 dark:text-cyan-300 font-medium">天后</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 backdrop-blur-sm border-2 border-amber-200 dark:border-amber-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div>
              <div className="font-medium text-amber-900 dark:text-amber-100">信用还款日</div>
              <div className="text-sm text-amber-700 dark:text-amber-300">{formatDate(config.creditDueDate)}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">{daysToDue}</div>
              <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">天后</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 信用额度使用 */}
      <Card className="border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom duration-700 delay-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
            <TrendingDown className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            信用额度使用
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400">已使用</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formatCurrency(stats.totalSpent)} / {formatCurrency(config.creditLimit)}
              </span>
            </div>
            <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${Math.min(100, usageRate)}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right font-medium">
              {usageRate.toFixed(1)}%
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="p-4 bg-gradient-to-br from-rose-600/10 to-red-600/10 dark:from-rose-600/20 dark:to-red-600/20 backdrop-blur-sm border-2 border-rose-200 dark:border-rose-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105">
              <div className="text-xs text-rose-700 dark:text-rose-300 mb-1 font-medium">剩余额度</div>
              <div className="text-lg md:text-xl font-bold bg-gradient-to-br from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400 bg-clip-text text-transparent">
                {formatCurrency(stats.availableCredit)}
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-600/10 to-green-600/10 dark:from-emerald-600/20 dark:to-green-600/20 backdrop-blur-sm border-2 border-emerald-200 dark:border-emerald-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105">
              <div className="text-xs text-emerald-700 dark:text-emerald-300 mb-1 font-medium">安全可花</div>
              <div className="text-lg md:text-xl font-bold bg-gradient-to-br from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
                {formatCurrency(stats.safeToSpend)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 预算建议 */}
      <Card className="border-2 border-cyan-200 dark:border-cyan-700 bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom duration-700 delay-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
            <DollarSign className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            预算建议
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-5 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 backdrop-blur-sm border-2 border-cyan-200 dark:border-cyan-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-2 font-medium">建议每日预算</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                {formatCurrency(Math.max(0, dailyBudget))}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">/ 天</div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              距离工资到账还有 {daysToSalary} 天
            </div>
          </div>

          <div className="p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">近7天消费情况</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gradient-to-br from-violet-600/5 to-indigo-600/5 dark:from-violet-600/10 dark:to-indigo-600/10 rounded-lg border border-violet-200 dark:border-violet-700">
                <span className="text-slate-600 dark:text-slate-400">总消费：</span>
                <span className="font-bold ml-1 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">{formatCurrency(recentTotal)}</span>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-600/5 to-green-600/5 dark:from-emerald-600/10 dark:to-green-600/10 rounded-lg border border-emerald-200 dark:border-emerald-700">
                <span className="text-slate-600 dark:text-slate-400">日均：</span>
                <span className="font-bold ml-1 bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">{formatCurrency(dailyAverage)}</span>
              </div>
            </div>
          </div>

          {dailyAverage > dailyBudget && dailyBudget > 0 && (
            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 backdrop-blur-sm border-2 border-amber-200 dark:border-amber-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 animate-in slide-in-from-top duration-500">
              <div className="text-sm text-amber-900 dark:text-amber-100">
                <span className="font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  消费预警
                </span>
                <div className="mt-2 text-amber-800 dark:text-amber-200">
                  近期日均消费 ({formatCurrency(dailyAverage)}) 超出建议预算，建议适当控制。
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 还款策略 */}
      <Card className="border-2 border-emerald-200 dark:border-emerald-700 bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom duration-700 delay-300">
        <CardHeader>
          <CardTitle className="text-lg bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
            还款策略
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-violet-600/10 to-indigo-600/10 dark:from-violet-600/20 dark:to-indigo-600/20 backdrop-blur-sm border-2 border-violet-200 dark:border-violet-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-lg">
                1
              </div>
              <div className="flex-1">
                <div className="font-medium mb-2 text-slate-800 dark:text-slate-200">保留必要金额</div>
                <div className="text-slate-600 dark:text-slate-400">
                  必须保留 <span className="font-bold bg-gradient-to-r from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400 bg-clip-text text-transparent">{formatCurrency(stats.mustKeep)}</span> 用于还款
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 backdrop-blur-sm border-2 border-cyan-200 dark:border-cyan-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-lg">
                2
              </div>
              <div className="flex-1">
                <div className="font-medium mb-2 text-slate-800 dark:text-slate-200">工资到账后处理</div>
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-cyan-700 dark:text-cyan-300">{formatDate(config.salaryDate)}</span> 收到工资 <span className="font-bold bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">{formatCurrency(config.salary)}</span> 后立即还款
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 backdrop-blur-sm border-2 border-amber-200 dark:border-amber-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-lg">
                3
              </div>
              <div className="flex-1">
                <div className="font-medium mb-2 text-slate-800 dark:text-slate-200">报销款及时追回</div>
                <div className="text-slate-600 dark:text-slate-400">
                  当前待报销 <span className="font-bold bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">{formatCurrency(stats.pendingReimbursement)}</span>，尽快追回用于还款
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
