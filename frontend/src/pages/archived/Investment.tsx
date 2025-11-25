import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, TrendingUp, PieChart, BarChart2, DollarSign, Layers } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useFinanceStore } from '@/store/useFinanceStore'
import { formatCurrency, formatShortDate, formatPercentage } from '@/utils/formatters'
import { INVESTMENT_TYPES } from '@/utils/constants'
import { calculateInvestmentRate } from '@/utils/calculations'
import { transactionToInvestment } from '@/store/types'

export default function Investment() {
  const {
    transactions, investments, addInvestment, deleteInvestment,
    addTransaction, deleteTransaction, loadTransactions,
    stats, config, accountBooks
  } = useFinanceStore()

  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'fixed_income' as 'precious_metal' | 'equity' | 'fixed_income',
    amount: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    accountBookId: '',
    note: '',
  })

  // 使用统一的交易数据并转换为investment格式
  const effectiveInvestments = useMemo(() => {
    if (transactions && transactions.length > 0) {
      // 如果有统一交易数据，使用它
      return transactions
        .filter(t => t.type === 'investment')
        .map(t => transactionToInvestment(t))
    }
    // 否则使用旧的investments数据
    return investments || []
  }, [transactions, investments])

  // 加载统一交易数据
  useEffect(() => {
    if (loadTransactions) {
      loadTransactions()
    }
  }, [loadTransactions])

  const activeInvestments = effectiveInvestments.filter(inv => inv.status === 'holding')

  // 投资统计数据
  const statistics = useMemo(() => {
    const total = stats?.totalInvestment || 0
    const count = activeInvestments.length
    const avg = count > 0 ? total / count : 0
    const max = count > 0 ? Math.max(...activeInvestments.map(i => i.amount)) : 0

    // 按类型统计
    const byType = INVESTMENT_TYPES.map(type => {
      const typeInvs = activeInvestments.filter(inv => inv.type === type.value)
      const amount = typeInvs.reduce((sum, inv) => sum + Number(inv.amount), 0)
      const percentage = total > 0 ? (amount / total) * 100 : 0
      return {
        ...type,
        amount,
        count: typeInvs.length,
        percentage,
        items: typeInvs
      }
    }).filter(t => t.count > 0)

    return {
      total,
      count,
      avg,
      max,
      byType
    }
  }, [activeInvestments, stats])

  const investmentRate = config ? calculateInvestmentRate(
    stats?.totalInvestment || 0,
    config.investmentCapital
  ) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 优先使用统一交易API
    if (transactions && addTransaction) {
      // 使用统一交易API
      await addTransaction({
        type: 'investment',
        subType: 'buy', // 投资默认是买入
        date: formData.purchaseDate,
        categoryTagId: '', // 投资不需要分类标签
        amount: parseFloat(formData.amount),
        description: formData.name,
        accountBookId: formData.accountBookId || undefined,
        note: formData.note,
        metadata: {
          status: 'holding',
          purchaseDate: formData.purchaseDate,
          name: formData.name,
          investmentType: formData.type
        }
      })
    } else {
      // 使用旧API
      await addInvestment({
        name: formData.name,
        type: formData.type,
        amount: parseFloat(formData.amount),
        purchaseDate: formData.purchaseDate,
        status: 'holding',
        accountBookId: formData.accountBookId || undefined,
        note: formData.note,
      })
    }

    setFormData({
      name: '',
      type: 'fixed_income',
      amount: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      accountBookId: '',
      note: '',
    })
    setIsOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条投资记录吗？')) {
      // 优先使用统一交易API
      if (transactions && deleteTransaction) {
        await deleteTransaction(id)
      } else {
        await deleteInvestment(id)
      }
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto pb-20 md:pb-6 animate-in fade-in duration-700">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
            投资分析
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            持仓: {formatCurrency(stats?.totalInvestment || 0)}
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
              <Plus className="w-4 h-4" />
              添加投资
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-slate-100">添加投资</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">产品名称</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：黄金ETF"
                  required
                  className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <Label htmlFor="type" className="text-slate-700 dark:text-slate-300">投资类型</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  required
                >
                  {INVESTMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="amount" className="text-slate-700 dark:text-slate-300">投资金额</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <Label htmlFor="purchaseDate" className="text-slate-700 dark:text-slate-300">购买日期</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  required
                  className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <Label htmlFor="accountBookId" className="text-slate-700 dark:text-slate-300">所属账本</Label>
                <select
                  id="accountBookId"
                  value={formData.accountBookId}
                  onChange={(e) => setFormData({ ...formData, accountBookId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                >
                  <option value="">选择账本（可选）</option>
                  {accountBooks.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.icon} {book.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="note" className="text-slate-700 dark:text-slate-300">备注（可选）</Label>
                <Input
                  id="note"
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="备注信息"
                  className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white">
                  添加
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200">
                  取消
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 投资统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-in slide-in-from-bottom duration-700 delay-100">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 backdrop-blur-sm border-2 border-cyan-200 dark:border-cyan-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">总持仓</span>
            </div>
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              {formatCurrency(statistics.total)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {statistics.count} 个产品
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-600/10 to-green-600/10 dark:from-emerald-600/20 dark:to-green-600/20 backdrop-blur-sm border-2 border-emerald-200 dark:border-emerald-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">平均投资</span>
            </div>
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
              {formatCurrency(statistics.avg)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              最大 {formatCurrency(statistics.max)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 资产配置分析 */}
      {statistics.byType.length > 0 && (
        <Card className="border-2 border-violet-200 dark:border-violet-700 bg-gradient-to-br from-violet-600/10 to-indigo-600/10 dark:from-violet-600/20 dark:to-indigo-600/20 backdrop-blur-sm shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 animate-in slide-in-from-bottom duration-700 delay-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
              <PieChart className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              资产配置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statistics.byType.map((type) => (
                <div key={type.value} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{type.icon}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{type.label}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">({type.count}个)</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                        {formatCurrency(type.amount)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {type.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <Progress value={type.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 资产概况 */}
      <Card className="border-2 border-cyan-200 dark:border-cyan-700 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 backdrop-blur-sm shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 animate-in slide-in-from-bottom duration-700 delay-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
            <TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            资产概况
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">投资本金</span>
              <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(config?.investmentCapital || 0)}
              </span>
            </div>
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">已投资</span>
              <span className="text-2xl font-bold bg-gradient-to-br from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                {formatCurrency(stats?.totalInvestment || 0)}
              </span>
            </div>
            <Progress value={investmentRate} className="h-3 mb-2" />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>使用率: {formatPercentage(investmentRate)}</span>
              <span>剩余: {formatCurrency(stats?.remainingInvestment || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 持仓明细 */}
      {statistics.byType.length > 0 && (
        <div className="space-y-3 animate-in slide-in-from-bottom duration-700 delay-400">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h3 className="text-lg font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
              持仓明细 ({statistics.count}个)
            </h3>
          </div>

          {statistics.byType.map((type) => (
            <Card key={type.value} className="border-2 border-slate-200 dark:border-slate-700 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <span className="text-2xl">{type.icon}</span>
                    <span>{type.label}</span>
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                      ({type.count}个 · {type.percentage.toFixed(1)}%)
                    </span>
                  </CardTitle>
                  <div className={`px-3 py-1 rounded-full font-bold ${
                    type.value === 'precious_metal'
                      ? 'bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700'
                      : type.value === 'equity'
                      ? 'bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700'
                      : 'bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
                  }`}>
                    {formatCurrency(type.amount)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {type.items.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-800/50 backdrop-blur-sm rounded-lg hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{inv.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatShortDate(inv.purchaseDate)}
                        {inv.note && ` · ${inv.note}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-lg bg-gradient-to-br from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                          {formatCurrency(inv.amount)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(inv.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeInvestments.length === 0 && (
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700 shadow-lg animate-in slide-in-from-bottom duration-700">
          <CardContent className="pt-6 text-center text-slate-500 dark:text-slate-400">
            暂无投资记录
          </CardContent>
        </Card>
      )}
    </div>
  )
}
