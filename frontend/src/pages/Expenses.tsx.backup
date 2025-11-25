import { useState, useMemo } from 'react'
import { Plus, Trash2, Copy, Zap, TrendingUp, PieChart as PieChartIcon, Calendar, BarChart3, Edit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFinanceStore } from '@/store/useFinanceStore'
import { formatCurrency, formatShortDate } from '@/utils/formatters'
import { EXPENSE_CATEGORIES } from '@/utils/constants'
import type { Expense } from '@/store/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

type TimeFilter = 'today' | 'week' | 'month' | 'all'

export default function Expenses() {
  const { expenses, addExpense, updateExpense, deleteExpense, addReimbursement, updateReimbursement, reimbursements, stats } = useFinanceStore()
  const [isOpen, setIsOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '生活必需',
    amount: '',
    description: '',
    needsReimbursement: false,
  })

  // 常用金额
  const quickAmounts = [10, 20, 50, 100, 200]

  // 时间和类型筛选逻辑
  const filteredExpenses = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return expenses.filter(exp => {
      const expDate = new Date(exp.date)
      expDate.setHours(0, 0, 0, 0)

      // 时间筛选
      let timeMatch = true
      switch (timeFilter) {
        case 'today':
          timeMatch = expDate.getTime() === now.getTime()
          break

        case 'week':
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          timeMatch = expDate >= weekAgo
          break

        case 'month':
          const monthAgo = new Date(now)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          timeMatch = expDate >= monthAgo
          break

        default:
          timeMatch = true
      }

      // 类型筛选
      const categoryMatch = categoryFilter === 'all' || exp.category === categoryFilter

      return timeMatch && categoryMatch
    })
  }, [expenses, timeFilter, categoryFilter])

  // 统计数据
  const statistics = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    const count = filteredExpenses.length
    const avg = count > 0 ? total / count : 0
    const max = count > 0 ? Math.max(...filteredExpenses.map(e => e.amount)) : 0

    // 按分类统计
    const byCategory = EXPENSE_CATEGORIES.map(cat => {
      const categoryExpenses = filteredExpenses.filter(e => e.category === cat.value)
      const amount = categoryExpenses.reduce((sum, e) => sum + e.amount, 0)
      const percentage = total > 0 ? (amount / total) * 100 : 0
      return {
        ...cat,
        amount,
        count: categoryExpenses.length,
        percentage
      }
    }).filter(c => c.count > 0).sort((a, b) => b.amount - a.amount)

    // 最近7天趋势
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const dayExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date)
        expDate.setHours(0, 0, 0, 0)
        return expDate.getTime() === date.getTime()
      })

      last7Days.push({
        date: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
        amount: dayExpenses.reduce((sum, e) => sum + e.amount, 0)
      })
    }

    return {
      total,
      count,
      avg,
      max,
      byCategory,
      last7Days
    }
  }, [filteredExpenses, expenses])

  const sortedExpenses = [...expenses].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingExpense) {
      // 编辑模式：更新支出记录
      await updateExpense(editingExpense.id, {
        date: formData.date,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        needsReimbursement: formData.needsReimbursement,
      })

      // 同步更新关联的报销记录
      if (editingExpense.reimbursementId) {
        await updateReimbursement(editingExpense.reimbursementId, {
          date: formData.date,
          item: formData.description,
          amount: parseFloat(formData.amount),
          note: `${EXPENSE_CATEGORIES.find(c => c.value === formData.category)?.label || ''}支出`,
        })
      }
    } else {
      // 添加模式：创建支出记录
      const expenseId = await addExpense({
        date: formData.date,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        needsReimbursement: formData.needsReimbursement,
      })

      // 如果需要报销，自动创建报销记录
      if (formData.needsReimbursement && expenseId) {
        await addReimbursement({
          date: formData.date,
          item: formData.description,
          amount: parseFloat(formData.amount),
          note: `${EXPENSE_CATEGORIES.find(c => c.value === formData.category)?.label || ''}支出`,
          status: 'pending',
          expenseId: expenseId,
        })
      }
    }

    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '生活必需',
      amount: '',
      description: '',
      needsReimbursement: false,
    })
    setEditingExpense(null)
    setIsOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条支出记录吗？')) {
      await deleteExpense(id)
    }
  }

  // 编辑支出
  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      date: expense.date,
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      needsReimbursement: expense.needsReimbursement || false,
    })
    setIsOpen(true)
  }

  // 快速设置金额
  const setQuickAmount = (amount: number) => {
    setFormData({ ...formData, amount: amount.toString() })
  }

  // 复制支出（再来一笔）
  const handleCopyExpense = (expense: Expense) => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      needsReimbursement: false,
    })
    setIsOpen(true)
  }

  // 获取最近5条支出
  const recentExpenses = sortedExpenses.slice(0, 5)

  const sortedFilteredExpenses = [...filteredExpenses].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto pb-20 md:pb-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">支出分析</h1>
          <p className="text-sm text-slate-500 mt-1">
            全部: {formatCurrency(stats?.totalSpent || 0)}
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) {
            setEditingExpense(null)
            setFormData({
              date: new Date().toISOString().split('T')[0],
              category: '生活必需',
              amount: '',
              description: '',
              needsReimbursement: false,
            })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              添加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExpense ? '编辑支出' : '添加支出'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="date">日期</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">分类</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="amount">金额</Label>
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {quickAmounts.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(amount)}
                        className={formData.amount === amount.toString() ? 'bg-blue-100 border-blue-300' : ''}
                      >
                        ¥{amount}
                      </Button>
                    ))}
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="或输入自定义金额"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">说明</Label>
                <Input
                  id="description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="支出说明"
                  required
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <input
                  id="needsReimbursement"
                  type="checkbox"
                  checked={formData.needsReimbursement}
                  onChange={(e) => setFormData({ ...formData, needsReimbursement: e.target.checked })}
                  className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                />
                <Label htmlFor="needsReimbursement" className="text-sm font-medium text-amber-900 cursor-pointer">
                  💰 需要报销（将自动创建报销记录）
                </Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">添加</Button>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  取消
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 📊 时间筛选 */}
      <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today">今天</TabsTrigger>
          <TabsTrigger value="week">本周</TabsTrigger>
          <TabsTrigger value="month">本月</TabsTrigger>
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 🏷️ 类型筛选 */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">按类型筛选</span>
            {categoryFilter !== 'all' && (
              <span className="text-xs text-purple-600 font-medium">
                · {formatCurrency(statistics.total)}
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Button
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('all')}
              className={categoryFilter === 'all' ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-purple-50'}
            >
              全部类型
            </Button>
            {EXPENSE_CATEGORIES.map((cat) => {
              const catExpenses = filteredExpenses.filter(e => e.category === cat.value)
              const catTotal = catExpenses.reduce((sum, e) => sum + e.amount, 0)
              const hasExpenses = timeFilter === 'all'
                ? expenses.some(e => e.category === cat.value)
                : catExpenses.length > 0

              if (!hasExpenses) return null

              return (
                <Button
                  key={cat.value}
                  variant={categoryFilter === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat.value)}
                  className={categoryFilter === cat.value
                    ? 'bg-purple-600 hover:bg-purple-700 whitespace-nowrap'
                    : 'hover:bg-purple-50 whitespace-nowrap'
                  }
                >
                  {cat.icon} {cat.label}
                  {categoryFilter === 'all' && catTotal > 0 && (
                    <span className="ml-1 text-xs opacity-75">
                      ({catExpenses.length})
                    </span>
                  )}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 📈 支出统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">
                {categoryFilter === 'all' ? '总支出' : `${EXPENSE_CATEGORIES.find(c => c.value === categoryFilter)?.label}支出`}
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(statistics.total)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              共 {statistics.count} 笔
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-slate-600">平均消费</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(statistics.avg)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              最高 {formatCurrency(statistics.max)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 📊 分类支出统计 */}
      {statistics.byCategory.length > 0 && (
        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-indigo-600" />
              分类支出占比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* 饼图 */}
              <div className="w-full lg:w-1/2 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statistics.byCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.label} ${entry.percentage.toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {statistics.byCategory.map((_entry, index) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      })}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 图例和详情 */}
              <div className="flex-1 w-full space-y-2">
                {statistics.byCategory.map((cat, index) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
                  return (
                    <div key={cat.value} className="flex items-center justify-between p-2 bg-white rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className="text-xl">{cat.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800">{cat.label}</div>
                          <div className="text-xs text-slate-500">{cat.count} 笔</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">
                          {formatCurrency(cat.amount)}
                        </div>
                        <div className="text-xs text-indigo-600 font-medium">
                          {cat.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 📅 最近7天趋势 */}
      <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            最近7天趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {statistics.last7Days.map((day, index) => {
              const maxAmount = Math.max(...statistics.last7Days.map(d => d.amount))
              const percentage = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="text-xs font-medium text-slate-600 w-12">
                    {day.date}
                  </div>
                  <div className="flex-1">
                    <div className="h-6 bg-orange-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-700 w-20 text-right">
                    {formatCurrency(day.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ⚡ 快速记账 - 最近消费 */}
      {recentExpenses.length > 0 && (
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              快速记账
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-slate-600 mb-2">点击"再来一笔"快速复制最近消费</div>
              {recentExpenses.slice(0, 3).map((expense) => {
                const category = EXPENSE_CATEGORIES.find(c => c.value === expense.category)
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xl">{category?.icon || '📝'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">
                          {expense.description}
                        </div>
                        <div className="text-xs text-slate-500">
                          {category?.label} · {formatCurrency(expense.amount)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyExpense(expense)}
                      className="flex items-center gap-1 text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <Copy className="w-3 h-3" />
                      再来一笔
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 支出列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-slate-800">
            支出明细 ({sortedFilteredExpenses.length})
          </h3>
        </div>
        {sortedFilteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-slate-500">
              {timeFilter === 'all' ? '暂无支出记录' : '该时间段暂无支出'}
            </CardContent>
          </Card>
        ) : (
          sortedFilteredExpenses.map((expense) => {
            const category = EXPENSE_CATEGORIES.find(c => c.value === expense.category)
            const reimbursement = expense.reimbursementId
              ? reimbursements.find(r => r.id === expense.reimbursementId)
              : null

            return (
              <Card key={expense.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-2xl">{category?.icon || '📝'}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{expense.description}</span>
                          {expense.needsReimbursement && (
                            reimbursement?.status === 'reimbursed' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                ✓ 已报销
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                💰 待报销
                              </span>
                            )
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatShortDate(expense.date)} · {category?.label || expense.category}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-bold text-lg text-red-600">
                          -{formatCurrency(expense.amount)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditExpense(expense)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
