import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, TrendingUp, Edit, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { incomesApi } from '@/api/incomes'
import { accountBooksApi } from '@/api/accountBooks'
import type { Income, AccountBook, Tag } from '@/store/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

type TimeFilter = 'today' | 'week' | 'month' | 'all'

const COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [accountBooks, setAccountBooks] = useState<AccountBook[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // 表单状态
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    categoryTagId: '',
    amount: '',
    description: '',
    accountBookId: '',
    note: '',
  })

  // 加载数据
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [incomesData, booksData, tagsData] = await Promise.all([
        incomesApi.getAll(),
        accountBooksApi.getAll(),
        // TODO: Load tags from API
        Promise.resolve([])
      ])
      setIncomes(incomesData)
      setAccountBooks(booksData)
      setTags(tagsData)

      // 设置默认账本
      if (booksData.length > 0 && !formData.accountBookId) {
        const defaultBook = booksData.find(b => b.isDefault) || booksData[0]
        setFormData(prev => ({ ...prev, accountBookId: defaultBook.id }))
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  // 获取收入分类标签
  const categoryTags = useMemo(() =>
    tags.filter(tag => tag.type === 'category'),
    [tags]
  )

  // 筛选收入
  const filteredIncomes = useMemo(() => {
    let filtered = [...incomes]

    // 时间筛选
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (timeFilter) {
      case 'today':
        filtered = filtered.filter(inc => {
          const incomeDate = new Date(inc.date)
          return incomeDate >= today
        })
        break
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        filtered = filtered.filter(inc => new Date(inc.date) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        filtered = filtered.filter(inc => new Date(inc.date) >= monthAgo)
        break
    }

    // 分类筛选
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(inc => inc.categoryTagId === categoryFilter)
    }

    // 按日期降序排序
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [incomes, timeFilter, categoryFilter])

  // 统计数据
  const stats = useMemo(() => {
    const total = filteredIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0)
    const count = filteredIncomes.length

    // 按分类统计
    const byCategory = filteredIncomes.reduce((acc, inc) => {
      const category = inc.categoryTagId || '未分类'
      if (!acc[category]) {
        acc[category] = { amount: 0, count: 0 }
      }
      acc[category].amount += Number(inc.amount)
      acc[category].count += 1
      return acc
    }, {} as Record<string, { amount: number; count: number }>)

    return { total, count, byCategory }
  }, [filteredIncomes])

  // 饼图数据
  const chartData = useMemo(() => {
    return Object.entries(stats.byCategory).map(([categoryId, data]) => {
      const tag = tags.find(t => t.id === categoryId)
      return {
        name: tag?.name || '未分类',
        value: data.amount,
        count: data.count,
      }
    }).sort((a, b) => b.value - a.value)
  }, [stats.byCategory, tags])

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingIncome) {
        // 更新收入
        await incomesApi.update(editingIncome.id, {
          ...formData,
          amount: parseFloat(formData.amount),
        })
      } else {
        // 创建收入
        await incomesApi.create({
          ...formData,
          amount: parseFloat(formData.amount),
        })
      }

      // 重新加载数据
      await loadData()

      // 重置表单
      setIsOpen(false)
      setEditingIncome(null)
      setFormData({
        date: new Date().toISOString().split('T')[0],
        categoryTagId: '',
        amount: '',
        description: '',
        accountBookId: accountBooks.find(b => b.isDefault)?.id || accountBooks[0]?.id || '',
        note: '',
      })
    } catch (error) {
      console.error('Failed to save income:', error)
    }
  }

  // 编辑收入
  const handleEdit = (income: Income) => {
    setEditingIncome(income)
    setFormData({
      date: income.date,
      categoryTagId: income.categoryTagId,
      amount: income.amount.toString(),
      description: income.description,
      accountBookId: income.accountBookId || '',
      note: income.note || '',
    })
    setIsOpen(true)
  }

  // 删除收入
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条收入记录吗？')) return

    try {
      await incomesApi.delete(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete income:', error)
    }
  }

  // 格式化金额
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount)
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto pb-20 md:pb-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
            收入管理
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            记录和管理各类收入
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              添加收入
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingIncome ? '编辑收入' : '添加收入'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="amount">金额</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="categoryTagId">收入类别</Label>
                <select
                  id="categoryTagId"
                  value={formData.categoryTagId}
                  onChange={(e) => setFormData({ ...formData, categoryTagId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  required
                >
                  <option value="">选择类别</option>
                  {categoryTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="description">描述</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="工资、奖金、副业收入等"
                  required
                />
              </div>

              <div>
                <Label htmlFor="accountBookId">账本</Label>
                <select
                  id="accountBookId"
                  value={formData.accountBookId}
                  onChange={(e) => setFormData({ ...formData, accountBookId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="">不关联账本</option>
                  {accountBooks.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.icon} {book.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="note">备注（可选）</Label>
                <Input
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="补充说明"
                />
              </div>

              <Button type="submit" className="w-full">
                {editingIncome ? '保存' : '添加'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              总收入
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
              {formatAmount(stats.total)}
            </div>
            <p className="text-xs text-slate-500 mt-1">{stats.count} 笔收入</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              平均每笔
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">
              {stats.count > 0 ? formatAmount(stats.total / stats.count) : formatAmount(0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              收入类别
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">
              {Object.keys(stats.byCategory).length}
            </div>
            <p className="text-xs text-slate-500 mt-1">不同的收入来源</p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选选项 */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 mb-2">时间范围</Label>
          <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="today">今天</TabsTrigger>
              <TabsTrigger value="week">本周</TabsTrigger>
              <TabsTrigger value="month">本月</TabsTrigger>
              <TabsTrigger value="all">全部</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 mb-2">收入类别</Label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="all">全部类别</option>
            {categoryTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 分类统计图表 */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              收入分类分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatAmount(value)}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 收入列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            收入记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIncomes.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>暂无收入记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredIncomes.map((income) => {
                const tag = tags.find(t => t.id === income.categoryTagId)
                const book = accountBooks.find(b => b.id === income.accountBookId)

                return (
                  <div
                    key={income.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{income.description}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          {tag?.name || '未分类'}
                        </span>
                        {book && (
                          <span className="text-xs text-slate-500">
                            {book.icon} {book.name}
                          </span>
                        )}
                      </div>
                      {income.note && (
                        <p className="text-xs text-slate-500 mt-1">{income.note}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(income.date)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          +{formatAmount(Number(income.amount))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(income)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(income.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
