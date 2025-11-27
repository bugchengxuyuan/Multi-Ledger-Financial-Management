import { useState, useMemo } from 'react'
import {
  Plus, Trash2, Search, SlidersHorizontal, Edit,
  TrendingUp, PieChart as PieChartIcon, Receipt,
  CircleDollarSign
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFinanceStore } from '@/store/useFinanceStore'
import { formatCurrency, formatShortDate, toNumber } from '@/utils/formatters'
import type { Transaction, TransactionType } from '@/store/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { INVESTMENT_TYPES } from '@/utils/constants'

type TimeFilter = 'today' | 'week' | 'month' | 'all'

export default function Transactions() {
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getCategoryTags,
    getTagById,
    config,
  } = useFinanceStore()

  // Tab状态
  const [activeTab, setActiveTab] = useState<TransactionType>('expense')

  // 对话框状态
  const [isOpen, setIsOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  // 筛选状态
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 表单数据
  const [formData, setFormData] = useState({
    type: activeTab,
    date: new Date().toISOString().split('T')[0],
    categoryTagId: '',
    amount: '',
    description: '',
    accountBookId: config?.currentAccountBookId || '',
    note: '',
    // Expense特有字段
    needsReimbursement: false,
    labelTagIds: [] as string[],
    receiptPhoto: '',
    location: '',
    // Investment特有字段
    subType: 'buy' as 'buy' | 'sell',
    investmentType: 'fixed_income' as 'precious_metal' | 'equity' | 'fixed_income',
    status: 'holding' as 'holding' | 'sold',
  })

  // 切换Tab时更新表单类型
  const handleTabChange = (type: TransactionType) => {
    setActiveTab(type)
    setFormData(prev => ({ ...prev, type }))
  }

  // 获取分类标签
  const allCategoryTags = getCategoryTags()

  // 根据当前Tab筛选交易
  const currentTypeTransactions = useMemo(() => {
    return transactions.filter(t => t.type === activeTab)
  }, [transactions, activeTab])

  // 应用筛选条件
  const filteredTransactions = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return currentTypeTransactions.filter(txn => {
      const txnDate = new Date(txn.date)
      txnDate.setHours(0, 0, 0, 0)

      // 账本筛选
      const accountBookMatch =
        !config?.currentAccountBookId || txn.accountBookId === config.currentAccountBookId

      // 时间筛选
      let timeMatch = true
      switch (timeFilter) {
        case 'today':
          timeMatch = txnDate.getTime() === now.getTime()
          break
        case 'week':
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          timeMatch = txnDate >= weekAgo
          break
        case 'month':
          const monthAgo = new Date(now)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          timeMatch = txnDate >= monthAgo
          break
        default:
          timeMatch = true
      }

      // 分类筛选
      const categoryMatch = categoryFilter === 'all' || txn.categoryTagId === categoryFilter

      // 关键词搜索
      const categoryTag = getTagById(txn.categoryTagId)
      const keywordMatch =
        !searchKeyword ||
        txn.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (categoryTag?.name || '').toLowerCase().includes(searchKeyword.toLowerCase())

      // 金额范围筛选
      const minMatch = !minAmount || toNumber(txn.amount) >= toNumber(minAmount)
      const maxMatch = !maxAmount || toNumber(txn.amount) <= toNumber(maxAmount)

      // 日期范围筛选
      const startMatch = !startDate || txn.date >= startDate
      const endMatch = !endDate || txn.date <= endDate

      return (
        accountBookMatch &&
        timeMatch &&
        categoryMatch &&
        keywordMatch &&
        minMatch &&
        maxMatch &&
        startMatch &&
        endMatch
      )
    })
  }, [
    currentTypeTransactions,
    config?.currentAccountBookId,
    timeFilter,
    categoryFilter,
    searchKeyword,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    getTagById,
  ])

  // 排序交易（按日期降序）
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [filteredTransactions])

  // 统计数据
  const statistics = useMemo(() => {
    const total = filteredTransactions.reduce((sum, txn) => sum + toNumber(txn.amount), 0)
    const count = filteredTransactions.length
    const avg = count > 0 ? total / count : 0
    const max = count > 0 ? Math.max(...filteredTransactions.map(t => toNumber(t.amount))) : 0

    // 按分类统计
    const byCategory = allCategoryTags
      .map(tag => {
        const categoryTxns = filteredTransactions.filter(t => t.categoryTagId === tag.id)
        const amount = categoryTxns.reduce((sum, t) => sum + toNumber(t.amount), 0)
        const percentage = total > 0 ? (amount / total) * 100 : 0
        return {
          value: tag.id,
          label: tag.name,
          color: tag.color,
          amount,
          count: categoryTxns.length,
          percentage,
        }
      })
      .filter(c => c.count > 0)
      .sort((a, b) => b.amount - a.amount)

    return { total, count, avg, max, byCategory }
  }, [filteredTransactions, allCategoryTags])

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const transactionData: Partial<Transaction> = {
      type: formData.type,
      date: formData.date,
      categoryTagId: formData.categoryTagId,
      amount: parseFloat(formData.amount),
      description: formData.description,
      accountBookId: formData.accountBookId || undefined,
      note: formData.note,
    }

    // 根据类型添加特定字段
    if (formData.type === 'expense') {
      transactionData.needsReimbursement = formData.needsReimbursement
      transactionData.labelTagIds = formData.labelTagIds
      transactionData.receiptPhoto = formData.receiptPhoto || undefined
      transactionData.location = formData.location || undefined
    } else if (formData.type === 'investment') {
      transactionData.subType = formData.subType
      transactionData.metadata = {
        status: formData.status,
        originalType: formData.investmentType,
        name: formData.description,
      }
    }

    if (editingTransaction) {
      // 更新
      await updateTransaction(editingTransaction.id, transactionData)
    } else {
      // 新增
      await addTransaction(transactionData as Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>)
    }

    resetForm()
  }

  // 重置表单
  const resetForm = () => {
    setFormData({
      type: activeTab,
      date: new Date().toISOString().split('T')[0],
      categoryTagId: allCategoryTags[0]?.id || '',
      amount: '',
      description: '',
      accountBookId: config?.currentAccountBookId || '',
      note: '',
      needsReimbursement: false,
      labelTagIds: [],
      receiptPhoto: '',
      location: '',
      subType: 'buy',
      investmentType: 'fixed_income',
      status: 'holding',
    })
    setEditingTransaction(null)
    setIsOpen(false)
  }

  // 删除交易
  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      await deleteTransaction(id)
    }
  }

  // 编辑交易
  const handleEdit = (txn: Transaction) => {
    setEditingTransaction(txn)
    setFormData({
      type: txn.type,
      date: txn.date.split('T')[0],
      categoryTagId: txn.categoryTagId,
      amount: txn.amount.toString(),
      description: txn.description,
      accountBookId: txn.accountBookId || config?.currentAccountBookId || '',
      note: txn.note || '',
      needsReimbursement: txn.needsReimbursement || false,
      labelTagIds: txn.labelTagIds || [],
      receiptPhoto: txn.receiptPhoto || '',
      location: txn.location || '',
      subType: (txn.subType as 'buy' | 'sell') || 'buy',
      investmentType:
        (txn.metadata as any)?.originalType || 'fixed_income',
      status: (txn.metadata as any)?.status || 'holding',
    })
    setIsOpen(true)
  }

  // Tab图标映射
  const tabIcons = {
    expense: Receipt,
    income: CircleDollarSign,
    investment: TrendingUp,
  }

  const TabIcon = tabIcons[activeTab]

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto pb-20 md:pb-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
            交易记录
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            统一管理所有收支与投资记录
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
              <Plus className="w-4 h-4" />
              添加交易
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-slate-900 dark:border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-slate-100">
                {editingTransaction ? '编辑交易' : '添加交易'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 交易类型选择 */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300">交易类型</Label>
                <Tabs
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as TransactionType })
                  }
                  className="mt-2"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="expense">支出</TabsTrigger>
                    <TabsTrigger value="income">收入</TabsTrigger>
                    <TabsTrigger value="investment">投资</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* 基础字段 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="text-slate-700 dark:text-slate-300">
                    日期
                  </Label>
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
                  <Label htmlFor="amount" className="text-slate-700 dark:text-slate-300">
                    金额
                  </Label>
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
              </div>

              <div>
                <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">
                  描述
                </Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入交易描述"
                  required
                  className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>

              {/* 分类选择 */}
              {formData.type !== 'investment' && (
                <div>
                  <Label htmlFor="category" className="text-slate-700 dark:text-slate-300">
                    分类
                  </Label>
                  <select
                    id="category"
                    value={formData.categoryTagId}
                    onChange={(e) => setFormData({ ...formData, categoryTagId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    required
                  >
                    <option value="">选择分类</option>
                    {allCategoryTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 投资特有字段 */}
              {formData.type === 'investment' && (
                <>
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">投资类型</Label>
                    <select
                      value={formData.investmentType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          investmentType: e.target.value as any,
                        })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    >
                      {INVESTMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">操作类型</Label>
                    <select
                      value={formData.subType}
                      onChange={(e) =>
                        setFormData({ ...formData, subType: e.target.value as 'buy' | 'sell' })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    >
                      <option value="buy">买入</option>
                      <option value="sell">卖出</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="note" className="text-slate-700 dark:text-slate-300">
                  备注
                </Label>
                <textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="添加备注信息"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="dark:border-slate-600 dark:text-slate-300"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                >
                  {editingTransaction ? '更新' : '添加'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tab切换 */}
      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TransactionType)}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            支出
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4" />
            收入
          </TabsTrigger>
          <TabsTrigger value="investment" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            投资
          </TabsTrigger>
        </TabsList>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-violet-600/10 to-indigo-600/10 dark:from-violet-600/20 dark:to-indigo-600/20 backdrop-blur-sm border-2 border-violet-200 dark:border-violet-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">总计</div>
              <div className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                {formatCurrency(statistics.total)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">笔数</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {statistics.count}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">平均</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(statistics.avg)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">最大</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(statistics.max)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选和搜索 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* 搜索 */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="搜索描述或分类..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="pl-10 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* 时间筛选 */}
                <Tabs
                  value={timeFilter}
                  onValueChange={(value) => setTimeFilter(value as TimeFilter)}
                >
                  <TabsList>
                    <TabsTrigger value="all">全部</TabsTrigger>
                    <TabsTrigger value="today">今天</TabsTrigger>
                    <TabsTrigger value="week">本周</TabsTrigger>
                    <TabsTrigger value="month">本月</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* 分类筛选 */}
                {activeTab !== 'investment' && (
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  >
                    <option value="all">所有分类</option>
                    {allCategoryTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 高级筛选 */}
              {showAdvancedFilter && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">最小金额</Label>
                    <Input
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="0.00"
                      className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">最大金额</Label>
                    <Input
                      type="number"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="0.00"
                      className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">开始日期</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">结束日期</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    />
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                className="dark:border-slate-600 dark:text-slate-300"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {showAdvancedFilter ? '隐藏' : '显示'}高级筛选
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 交易列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TabIcon className="w-5 h-5" />
                {activeTab === 'expense' && '支出记录'}
                {activeTab === 'income' && '收入记录'}
                {activeTab === 'investment' && '投资记录'}
              </span>
              <span className="text-sm font-normal text-slate-500">
                共 {sortedTransactions.length} 条记录
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedTransactions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  暂无{activeTab === 'expense' ? '支出' : activeTab === 'income' ? '收入' : '投资'}
                  记录
                </div>
              ) : (
                sortedTransactions.map((txn) => {
                  const categoryTag = getTagById(txn.categoryTagId)
                  return (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${categoryTag?.color}20` }}
                        >
                          {categoryTag?.name?.[0] || '📝'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {txn.description}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {formatShortDate(txn.date)} · {categoryTag?.name || '未分类'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-lg text-slate-900 dark:text-slate-100">
                            {formatCurrency(toNumber(txn.amount))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(txn)}
                            className="dark:text-slate-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(txn.id)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* 分类统计图表 */}
        {statistics.byCategory.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                分类统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-1/2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statistics.byCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="amount"
                      >
                        {statistics.byCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {statistics.byCategory.map((cat) => (
                    <div
                      key={cat.value}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {cat.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(cat.amount)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {cat.percentage.toFixed(1)}% · {cat.count}笔
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </Tabs>
    </div>
  )
}
