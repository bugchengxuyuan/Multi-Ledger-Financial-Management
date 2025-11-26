import { useMemo } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Wallet, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency, formatShortDate } from '@/utils/formatters'

export default function DashboardNew() {
  const { accountBooks, transactions, config, tags } = useFinanceStore()

  // 获取当前选中的账本
  const currentBook = useMemo(() => {
    if (!config?.currentAccountBookId) return accountBooks[0]
    return accountBooks.find(b => b.id === config.currentAccountBookId) || accountBooks[0]
  }, [accountBooks, config?.currentAccountBookId])

  // 筛选当前账本的交易
  const bookTransactions = useMemo(() => {
    if (!currentBook) return []
    return transactions.filter(t => t.accountBookId === currentBook.id)
  }, [transactions, currentBook])

  // 计算本月统计
  const monthlyStats = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const monthTransactions = bookTransactions.filter(t => {
      const txDate = new Date(t.date)
      return txDate >= startOfMonth
    })

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    return { income, expense, balance: income - expense }
  }, [bookTransactions])

  // 获取最近交易
  const recentTransactions = useMemo(() => {
    return [...bookTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
  }, [bookTransactions])

  // 按分类统计支出
  const categoryStats = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const monthExpenses = bookTransactions.filter(t => {
      const txDate = new Date(t.date)
      return t.type === 'expense' && txDate >= startOfMonth
    })

    const categoryMap: Record<string, { name: string; amount: number; color: string }> = {}

    monthExpenses.forEach(t => {
      const tag = tags.find(tag => tag.id === t.categoryTagId)
      if (tag) {
        if (!categoryMap[tag.id]) {
          categoryMap[tag.id] = { name: tag.name, amount: 0, color: tag.color }
        }
        categoryMap[tag.id].amount += Number(t.amount)
      }
    })

    return Object.values(categoryMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [bookTransactions, tags])

  // 计算总余额
  const totalBalance = useMemo(() => {
    if (!currentBook) return 0
    const income = bookTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const expense = bookTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    return currentBook.initialBalance + income - expense
  }, [bookTransactions, currentBook])

  if (!currentBook) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <Wallet className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">请先创建一个账本</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
          {currentBook.icon} {currentBook.name}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-sm">账本余额</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
              </div>
              <Wallet className="w-10 h-10 text-violet-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">本月收入</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {formatCurrency(monthlyStats.income)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">本月支出</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {formatCurrency(monthlyStats.expense)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近交易 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              最近交易
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">暂无交易记录</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map(tx => {
                  const tag = tags.find(t => t.id === tx.categoryTagId)
                  const isIncome = tx.type === 'income'
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: tag?.color + '20' }}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{tx.description}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {tag?.name} · {formatShortDate(tx.date)}
                          </p>
                        </div>
                      </div>
                      <span className={`font-semibold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 本月支出分类 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              本月支出分类
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryStats.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">暂无支出记录</p>
            ) : (
              <div className="space-y-4">
                {categoryStats.map((cat, i) => {
                  const percentage = monthlyStats.expense > 0
                    ? (cat.amount / monthlyStats.expense * 100).toFixed(1)
                    : 0
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{cat.name}</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {formatCurrency(cat.amount)} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: cat.color
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
