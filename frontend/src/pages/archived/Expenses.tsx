import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Trash2, TrendingUp, PieChart as PieChartIcon, Calendar,
  BarChart3, Edit, Search, SlidersHorizontal, CheckSquare, Square,
  AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useFinanceStore } from '@/store/useFinanceStore'
import { formatCurrency, formatShortDate, toNumber } from '@/utils/formatters'
import type { Expense, SortOption, Tag, Transaction } from '@/store/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { detectAllAnomalies } from '@/utils/expenseAnalytics'
import { getDescriptionSuggestions, getAmountRecommendations } from '@/utils/smartInput'
import { transactionToExpense, expenseToTransaction } from '@/store/types'

type TimeFilter = 'today' | 'week' | 'month' | 'all'

export default function Expenses() {
  const {
    transactions, expenses, addExpense, updateExpense, deleteExpense,
    addTransaction, updateTransaction, deleteTransaction, loadTransactions,
    addReimbursement, updateReimbursement, reimbursements,
    stats, accountBooks, config,
    tags, getCategoryTags, getLabelTags, getTagById,
    getCategoryTagsForAccountBook, getLabelTagsForAccountBook
  } = useFinanceStore()

  // 使用统一的交易数据并转换为expense格式
  const effectiveExpenses = useMemo(() => {
    if (transactions && transactions.length > 0) {
      // 如果有统一交易数据，使用它
      return transactions
        .filter(t => t.type === 'expense')
        .map(t => transactionToExpense(t))
    }
    // 否则使用旧的expenses数据
    return expenses || []
  }, [transactions, expenses])

  // 加载统一交易数据
  useEffect(() => {
    if (loadTransactions) {
      loadTransactions()
    }
  }, [loadTransactions])

  // 获取全局分类标签和普通标签（用于全局筛选和统计）
  const allCategoryTags = getCategoryTags()
  const allLabelTags = getLabelTags()

  // 基础状态
  const [isOpen, setIsOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // 高级筛选状态
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 排序状态
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')

  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 分组显示状态
  const [groupByDate, setGroupByDate] = useState(true)

  // 表单状态
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    categoryTagId: allCategoryTags[0]?.id || '',
    amount: '',
    description: '',
    needsReimbursement: false,
    labelTagIds: [] as string[],
    note: '',
    accountBookId: config?.currentAccountBookId || ''
  })

  // 根据当前账本获取可用的标签
  const availableCategoryTags = useMemo(() =>
    getCategoryTagsForAccountBook(formData.accountBookId || null),
    [formData.accountBookId, tags]
  )

  const availableLabelTags = useMemo(() =>
    getLabelTagsForAccountBook(formData.accountBookId || null),
    [formData.accountBookId, tags]
  )

  // 智能输入状态
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([])
  const [amountRecommendation, setAmountRecommendation] = useState<{min: number; max: number; avg: number; mode: number} | null>(null)

  // 常用金额
  const quickAmounts = [10, 20, 50, 100, 200]

  // 异常检测
  const anomalies = useMemo(() => detectAllAnomalies(effectiveExpenses), [effectiveExpenses])

  // 智能描述建议
  useEffect(() => {
    if (formData.description.length >= 1) {
      const suggestions = getDescriptionSuggestions(formData.description, effectiveExpenses, 5)
      setDescriptionSuggestions(suggestions)

      const categoryTag = getTagById(formData.categoryTagId)
      const amountRec = getAmountRecommendations(formData.description, categoryTag?.name || '', effectiveExpenses)
      setAmountRecommendation(amountRec)
    } else {
      setDescriptionSuggestions([])
      setAmountRecommendation(null)
    }
  }, [formData.description, formData.categoryTagId, effectiveExpenses, getTagById])

  // 高级筛选逻辑
  const filteredExpenses = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return effectiveExpenses.filter(exp => {
      const expDate = new Date(exp.date)
      expDate.setHours(0, 0, 0, 0)

      // 账本筛选 - 只显示当前账本的支出
      const accountBookMatch = !config?.currentAccountBookId ||
                              exp.accountBookId === config.currentAccountBookId

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

      // 类别筛选
      const categoryMatch = categoryFilter === 'all' || exp.categoryTagId === categoryFilter

      // 关键词搜索
      const categoryTag = getTagById(exp.categoryTagId)
      const keywordMatch = !searchKeyword ||
        exp.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (categoryTag?.name || '').toLowerCase().includes(searchKeyword.toLowerCase())

      // 金额范围筛选
      const minMatch = !minAmount || exp.amount >= toNumber(minAmount)
      const maxMatch = !maxAmount || exp.amount <= toNumber(maxAmount)

      // 日期范围筛选
      const startMatch = !startDate || exp.date >= startDate
      const endMatch = !endDate || exp.date <= endDate

      return accountBookMatch && timeMatch && categoryMatch && keywordMatch && minMatch && maxMatch && startMatch && endMatch
    })
  }, [effectiveExpenses, config?.currentAccountBookId, timeFilter, categoryFilter, searchKeyword, minAmount, maxAmount, startDate, endDate])

  // 排序逻辑
  const sortedExpenses = useMemo(() => {
    const sorted = [...filteredExpenses]
    switch (sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      case 'amount-desc':
        return sorted.sort((a, b) => b.amount - a.amount)
      case 'amount-asc':
        return sorted.sort((a, b) => a.amount - b.amount)
      case 'category':
        return sorted.sort((a, b) => {
          const catA = getTagById(a.categoryTagId)?.name || ''
          const catB = getTagById(b.categoryTagId)?.name || ''
          return catA.localeCompare(catB)
        })
      default:
        return sorted
    }
  }, [filteredExpenses, sortBy])

  // 按日期分组
  const groupedExpenses = useMemo(() => {
    if (!groupByDate) return null

    const groups: Record<string, Expense[]> = {}
    sortedExpenses.forEach(exp => {
      if (!groups[exp.date]) {
        groups[exp.date] = []
      }
      groups[exp.date].push(exp)
    })

    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
  }, [sortedExpenses, groupByDate])

  // 统计数据
  const statistics = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
    const count = filteredExpenses.length
    const avg = count > 0 ? total / count : 0
    const max = count > 0 ? Math.max(...filteredExpenses.map(e => Number(e.amount))) : 0

    // 按分类统计
    const byCategory = allCategoryTags.map(tag => {
      const categoryExpenses = filteredExpenses.filter(e => e.categoryTagId === tag.id)
      const amount = categoryExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
      const percentage = total > 0 ? (amount / total) * 100 : 0
      return {
        value: tag.id,
        label: tag.name,
        color: tag.color,
        amount,
        count: categoryExpenses.length,
        percentage
      }
    }).filter(c => c.count > 0).sort((a, b) => b.amount - a.amount)

    return {
      total,
      count,
      avg,
      max,
      byCategory
    }
  }, [filteredExpenses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingExpense) {
      // 编辑模式 - 优先使用统一交易API
      if (transactions && updateTransaction) {
        // 使用统一交易API
        const transaction = expenseToTransaction(editingExpense)
        await updateTransaction(transaction.id, {
          date: formData.date,
          categoryTagId: formData.categoryTagId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          needsReimbursement: formData.needsReimbursement,
          labelTagIds: formData.labelTagIds,
          note: formData.note,
          accountBookId: formData.accountBookId || undefined
        })
      } else {
        // 使用旧API
        await updateExpense(editingExpense.id, {
          date: formData.date,
          categoryTagId: formData.categoryTagId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          needsReimbursement: formData.needsReimbursement,
          labelTagIds: formData.labelTagIds,
          note: formData.note,
          accountBookId: formData.accountBookId || undefined
        })
      }

      if (editingExpense.reimbursementId) {
        const categoryTag = getTagById(formData.categoryTagId)
        await updateReimbursement(editingExpense.reimbursementId, {
          date: formData.date,
          item: formData.description,
          amount: parseFloat(formData.amount),
          note: `${categoryTag?.name || ''}支出`,
        })
      }
    } else {
      // 添加模式 - 优先使用统一交易API
      let expenseId: string | undefined

      if (transactions && addTransaction) {
        // 使用统一交易API
        const transaction = await addTransaction({
          type: 'expense',
          date: formData.date,
          categoryTagId: formData.categoryTagId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          needsReimbursement: formData.needsReimbursement,
          labelTagIds: formData.labelTagIds,
          note: formData.note,
          accountBookId: formData.accountBookId || undefined
        })
        expenseId = transaction
      } else {
        // 使用旧API
        expenseId = await addExpense({
          date: formData.date,
          categoryTagId: formData.categoryTagId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          needsReimbursement: formData.needsReimbursement,
          labelTagIds: formData.labelTagIds,
          note: formData.note,
          accountBookId: formData.accountBookId || undefined
        })
      }

      if (formData.needsReimbursement && expenseId) {
        const categoryTag = getTagById(formData.categoryTagId)
        await addReimbursement({
          date: formData.date,
          item: formData.description,
          amount: parseFloat(formData.amount),
          note: `${categoryTag?.name || ''}支出`,
          status: 'pending',
          expenseId: expenseId,
        })
      }
    }

    resetForm()
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      categoryTagId: availableCategoryTags[0]?.id || '',
      amount: '',
      description: '',
      needsReimbursement: false,
      labelTagIds: [],
      note: '',
      accountBookId: config?.currentAccountBookId || ''
    })
    setEditingExpense(null)
    setIsOpen(false)
    setDescriptionSuggestions([])
    setAmountRecommendation(null)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条支出记录吗？')) {
      // 优先使用统一交易API
      if (transactions && deleteTransaction) {
        await deleteTransaction(id)
      } else {
        await deleteExpense(id)
      }
    }
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      date: expense.date,
      categoryTagId: expense.categoryTagId,
      amount: expense.amount.toString(),
      description: expense.description,
      needsReimbursement: expense.needsReimbursement || false,
      labelTagIds: expense.labelTagIds || [],
      note: expense.note || '',
      accountBookId: expense.accountBookId || config?.currentAccountBookId || ''
    })
    setIsOpen(true)
  }

  const setQuickAmount = (amount: number) => {
    setFormData({ ...formData, amount: amount.toString() })
  }

  // 批量操作
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedExpenses.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedExpenses.map(e => e.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (window.confirm(`确定要删除选中的 ${selectedIds.size} 条记录吗？`)) {
      for (const id of selectedIds) {
        // 优先使用统一交易API
        if (transactions && deleteTransaction) {
          await deleteTransaction(id)
        } else {
          await deleteExpense(id)
        }
      }
      setSelectedIds(new Set())
      setBatchMode(false)
    }
  }

  const clearAllFilters = () => {
    setSearchKeyword('')
    setMinAmount('')
    setMaxAmount('')
    setStartDate('')
    setEndDate('')
    setCategoryFilter('all')
    setTimeFilter('all')
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto pb-20 md:pb-6 animate-in fade-in duration-700">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            支出管理
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            全部: {formatCurrency(stats?.totalSpent || 0)} · {expenses.length} 笔记录
          </p>
        </div>
        <div className="flex gap-2">
          {batchMode && (
            <Button
              onClick={handleBatchDelete}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <Trash2 className="w-4 h-4" />
              删除 ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setBatchMode(!batchMode)
              setSelectedIds(new Set())
            }}
            className="border-2 border-slate-300 dark:border-slate-600 hover:border-violet-400 dark:hover:border-violet-500 dark:bg-slate-800 dark:text-slate-200 transition-all duration-300"
          >
            {batchMode ? '取消批量' : '批量操作'}
          </Button>
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                <Plus className="w-4 h-4" />
                添加支出
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-slate-100">
                  {editingExpense ? '编辑支出' : '添加支出'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="date" className="text-slate-700 dark:text-slate-300">日期</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryTagId" className="text-slate-700 dark:text-slate-300">分类</Label>
                  <select
                    id="categoryTagId"
                    value={formData.categoryTagId}
                    onChange={(e) => setFormData({ ...formData, categoryTagId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    required
                  >
                    {availableCategoryTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">说明</Label>
                  <Input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="支出说明"
                    required
                    autoComplete="off"
                    className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  />
                  {descriptionSuggestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {descriptionSuggestions.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mr-2 text-xs dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                          onClick={() => setFormData({ ...formData, description: suggestion })}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="amount" className="text-slate-700 dark:text-slate-300">金额</Label>
                  {amountRecommendation && (
                    <div className="mb-2 p-2 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 border border-cyan-200 dark:border-cyan-800 rounded text-xs text-cyan-800 dark:text-cyan-200">
                      <Lightbulb className="w-3 h-3 inline mr-1" />
                      建议金额: ¥{amountRecommendation.mode} (常见) |
                      平均: ¥{amountRecommendation.avg.toFixed(0)} |
                      范围: ¥{amountRecommendation.min}-¥{amountRecommendation.max}
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      {quickAmounts.map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setQuickAmount(amount)}
                          className={formData.amount === amount.toString()
                            ? 'bg-gradient-to-r from-violet-100 to-indigo-100 dark:from-violet-900 dark:to-indigo-900 border-violet-300 dark:border-violet-600'
                            : 'dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300'}
                        >
                          ¥{amount}
                        </Button>
                      ))}
                      {amountRecommendation && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setQuickAmount(amountRecommendation.mode)}
                          className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-emerald-300 dark:border-emerald-700"
                        >
                          ¥{amountRecommendation.mode} ⭐
                        </Button>
                      )}
                    </div>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="或输入自定义金额"
                      required
                      className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="note" className="text-slate-700 dark:text-slate-300">备注（可选）</Label>
                  <Input
                    id="note"
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="添加备注信息"
                    className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  />
                </div>
                {accountBooks.length > 0 && (
                  <div>
                    <Label htmlFor="accountBook" className="text-slate-700 dark:text-slate-300">所属账本</Label>
                    <select
                      id="accountBook"
                      value={formData.accountBookId}
                      onChange={(e) => setFormData({ ...formData, accountBookId: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    >
                      <option value="">不指定账本</option>
                      {accountBooks.map((book) => (
                        <option key={book.id} value={book.id}>
                          {book.icon} {book.name}
                          {book.isDefault && ' (默认)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {availableLabelTags.length > 0 && (
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 mb-2 block">
                      🏷️ 标签（可多选）
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {availableLabelTags.map((tag) => (
                        <label
                          key={tag.id}
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            formData.labelTagIds.includes(tag.id)
                              ? 'border-violet-500 dark:border-violet-400 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 shadow-md'
                              : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-violet-300 dark:hover:border-violet-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.labelTagIds.includes(tag.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  labelTagIds: [...formData.labelTagIds, tag.id]
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  labelTagIds: formData.labelTagIds.filter(id => id !== tag.id)
                                })
                              }
                            }}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {tag.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <input
                    id="needsReimbursement"
                    type="checkbox"
                    checked={formData.needsReimbursement}
                    onChange={(e) => setFormData({ ...formData, needsReimbursement: e.target.checked })}
                    className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                  />
                  <Label htmlFor="needsReimbursement" className="text-sm font-medium text-amber-900 dark:text-amber-100 cursor-pointer">
                    💰 需要报销（将自动创建报销记录）
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white">
                    {editingExpense ? '保存' : '添加'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200">
                    取消
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 异常检测提示 */}
      {anomalies.length > 0 && (
        <Alert className="border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 animate-in slide-in-from-top duration-500">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <div className="font-semibold mb-1">检测到 {anomalies.length} 条异常提示</div>
            <div className="text-sm space-y-1">
              {anomalies.slice(0, 3).map((anomaly, idx) => (
                <div key={idx}>• {anomaly.message}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 搜索栏 */}
      <Card className="border-2 border-slate-200 dark:border-slate-700 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="pt-4 pb-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  placeholder="搜索支出描述或类别..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-500"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                className="flex items-center gap-2 border-2 border-slate-300 dark:border-slate-600 hover:border-cyan-400 dark:hover:border-cyan-500 dark:bg-slate-800 dark:text-slate-200 transition-all duration-300"
              >
                <SlidersHorizontal className="w-4 h-4" />
                高级筛选
                {showAdvancedFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {showAdvancedFilter && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t dark:border-slate-700 animate-in slide-in-from-top duration-300">
                <div>
                  <Label className="text-xs text-slate-700 dark:text-slate-300">最小金额</Label>
                  <Input
                    type="number"
                    placeholder="¥0"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-700 dark:text-slate-300">最大金额</Label>
                  <Input
                    type="number"
                    placeholder="¥999999"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-700 dark:text-slate-300">开始日期</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-700 dark:text-slate-300">结束日期</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  />
                </div>
                <div className="col-span-full flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <Filter className="w-3 h-3" />
                    清除筛选
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 时间筛选和排序 */}
      <div className="flex flex-col md:flex-row gap-3">
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)} className="flex-1">
          <TabsList className="grid w-full grid-cols-4 dark:bg-slate-800 dark:border-slate-700">
            <TabsTrigger value="today" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-700">今天</TabsTrigger>
            <TabsTrigger value="week" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-700">本周</TabsTrigger>
            <TabsTrigger value="month" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-700">本月</TabsTrigger>
            <TabsTrigger value="all" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-700">全部</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
          >
            <option value="date-desc">日期↓</option>
            <option value="date-asc">日期↑</option>
            <option value="amount-desc">金额↓</option>
            <option value="amount-asc">金额↑</option>
            <option value="category">分类</option>
          </select>

          <Button
            variant="outline"
            onClick={() => setGroupByDate(!groupByDate)}
            className="whitespace-nowrap border-2 border-slate-300 dark:border-slate-600 hover:border-cyan-400 dark:hover:border-cyan-500 dark:bg-slate-800 dark:text-slate-200 transition-all duration-300"
          >
            {groupByDate ? '取消分组' : '按日期分组'}
          </Button>
        </div>
      </div>

      {/* 类别筛选 */}
      <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-purple-950/50 dark:to-pink-950/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <PieChartIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">按类型筛选</span>
            {categoryFilter !== 'all' && (
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                · {formatCurrency(statistics.total)}
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Button
              size="sm"
              onClick={() => setCategoryFilter('all')}
              className={categoryFilter === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5'
                : 'bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 transition-all duration-300'}
            >
              全部类型
            </Button>
            {allCategoryTags.map((tag) => {
              const tagExpenses = filteredExpenses.filter(e => e.categoryTagId === tag.id)
              const hasExpenses = tagExpenses.length > 0

              if (!hasExpenses && timeFilter !== 'all') return null

              return (
                <Button
                  key={tag.id}
                  size="sm"
                  onClick={() => setCategoryFilter(tag.id)}
                  className={categoryFilter === tag.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 whitespace-nowrap'
                    : 'bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 transition-all duration-300 whitespace-nowrap'
                  }
                >
                  {tag.name}
                  {categoryFilter === 'all' && tagExpenses.length > 0 && (
                    <span className="ml-1 text-xs opacity-75">
                      ({tagExpenses.length})
                    </span>
                  )}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-2 border-blue-200 dark:border-blue-800 backdrop-blur-sm bg-gradient-to-br from-blue-50/80 to-cyan-50/80 dark:from-blue-950/50 dark:to-cyan-950/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">总支出</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {formatCurrency(statistics.total)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              共 {statistics.count} 笔
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 dark:border-green-800 backdrop-blur-sm bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-950/50 dark:to-emerald-950/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">平均消费</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {formatCurrency(statistics.avg)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              最高 {formatCurrency(statistics.max)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 分类统计饼图 */}
      {statistics.byCategory.length > 0 && (
        <Card className="border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/50 dark:to-purple-950/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <PieChartIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              分类支出占比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
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

              <div className="flex-1 w-full space-y-2">
                {statistics.byCategory.map((cat, index) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
                  return (
                    <div key={cat.value} className="flex items-center justify-between p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-4 h-4 rounded-full shadow-sm"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{cat.label}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{cat.count} 笔</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(cat.amount)}
                        </div>
                        <div className="text-xs bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-medium">
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

      {/* 支出列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
            支出明细 ({sortedExpenses.length})
            {batchMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="ml-2 border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 transition-all duration-300"
              >
                {selectedIds.size === sortedExpenses.length ? (
                  <>
                    <CheckSquare className="w-4 h-4 mr-1" />
                    全不选
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-1" />
                    全选
                  </>
                )}
              </Button>
            )}
          </h3>
        </div>

        {sortedExpenses.length === 0 ? (
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6 text-center text-slate-500 dark:text-slate-400">
              暂无支出记录
            </CardContent>
          </Card>
        ) : groupByDate && groupedExpenses ? (
          // 分组显示
          groupedExpenses.map(([date, exps], groupIndex) => {
            const dayTotal = exps.reduce((sum, e) => sum + Number(e.amount), 0)
            return (
              <div
                key={date}
                className="space-y-2 animate-in slide-in-from-bottom duration-500"
                style={{ animationDelay: `${groupIndex * 50}ms` }}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">({exps.length}笔)</span>
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(dayTotal)}</span>
                </div>
                {exps.map((expense, expIndex) => {
                  const categoryTag = getTagById(expense.categoryTagId)
                  const reimbursement = expense.reimbursementId
                    ? reimbursements.find(r => r.id === expense.reimbursementId)
                    : null
                  const accountBook = expense.accountBookId
                    ? accountBooks.find(b => b.id === expense.accountBookId)
                    : null

                  return (
                    <Card
                      key={expense.id}
                      className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom"
                      style={{
                        animationDelay: `${(groupIndex * 50) + (expIndex * 30)}ms`,
                        borderLeftWidth: accountBook ? '4px' : undefined,
                        borderLeftColor: accountBook ? accountBook.color : undefined
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          {batchMode && (
                            <div className="mr-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleSelect(expense.id)}
                                className="dark:hover:bg-slate-800"
                              >
                                {selectedIds.has(expense.id) ? (
                                  <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                )}
                              </Button>
                            </div>
                          )}
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-800 dark:text-slate-200">{expense.description}</span>
                                {accountBook && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border" style={{
                                    backgroundColor: `${accountBook.color}15`,
                                    borderColor: accountBook.color,
                                    color: accountBook.color
                                  }}>
                                    {accountBook.icon} {accountBook.name}
                                  </span>
                                )}
                                {expense.needsReimbursement && (
                                  reimbursement?.status === 'reimbursed' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-700">
                                      ✓ 已报销
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-700">
                                      💰 待报销
                                    </span>
                                  )
                                )}
                                {expense.note && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">📝 {expense.note}</span>
                                )}
                              </div>
                              {expense.labelTagIds && expense.labelTagIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {expense.labelTagIds.map(tagId => {
                                    const tag = getTagById(tagId)
                                    if (!tag) return null
                                    return (
                                      <span
                                        key={tagId}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border"
                                        style={{
                                          backgroundColor: `${tag.color}15`,
                                          borderColor: tag.color,
                                          color: tag.color
                                        }}
                                      >
                                        {tag.name}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {formatShortDate(expense.date)} · {categoryTag?.name || '未知分类'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="font-bold text-lg bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                                -{formatCurrency(expense.amount)}
                              </div>
                            </div>
                            {!batchMode && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditExpense(expense)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-300"
                                  title="编辑"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(expense.id)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-300"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          })
        ) : (
          // 常规列表显示
          sortedExpenses.map((expense, index) => {
            const categoryTag = getTagById(expense.categoryTagId)
            const reimbursement = expense.reimbursementId
              ? reimbursements.find(r => r.id === expense.reimbursementId)
              : null
            const accountBook = expense.accountBookId
              ? accountBooks.find(b => b.id === expense.accountBookId)
              : null

            return (
              <Card
                key={expense.id}
                className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom"
                style={{
                  animationDelay: `${index * 30}ms`,
                  borderLeftWidth: accountBook ? '4px' : undefined,
                  borderLeftColor: accountBook ? accountBook.color : undefined
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    {batchMode && (
                      <div className="mr-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSelect(expense.id)}
                          className="dark:hover:bg-slate-800"
                        >
                          {selectedIds.has(expense.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                          )}
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{expense.description}</span>
                          {accountBook && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border" style={{
                              backgroundColor: `${accountBook.color}15`,
                              borderColor: accountBook.color,
                              color: accountBook.color
                            }}>
                              {accountBook.icon} {accountBook.name}
                            </span>
                          )}
                          {expense.needsReimbursement && (
                            reimbursement?.status === 'reimbursed' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-700">
                                ✓ 已报销
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-700">
                                💰 待报销
                              </span>
                            )
                          )}
                        </div>
                        {expense.labelTagIds && expense.labelTagIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {expense.labelTagIds.map(tagId => {
                              const tag = getTagById(tagId)
                              if (!tag) return null
                              return (
                                <span
                                  key={tagId}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border"
                                  style={{
                                    backgroundColor: `${tag.color}15`,
                                    borderColor: tag.color,
                                    color: tag.color
                                  }}
                                >
                                  {tag.name}
                                </span>
                              )
                            })}
                          </div>
                        )}
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {formatShortDate(expense.date)} · {categoryTag?.name || '未知分类'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-bold text-lg bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                          -{formatCurrency(expense.amount)}
                        </div>
                      </div>
                      {!batchMode && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditExpense(expense)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-300"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-300"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
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
