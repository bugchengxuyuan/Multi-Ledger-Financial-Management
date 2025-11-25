import { useState, useMemo } from 'react'
import { Plus, Trash2, Edit, Check, Tag as TagIcon, BookOpen, DollarSign, RefreshCw, FileText, Circle, Play, AlertTriangle, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { useFinanceStore } from '@/store/useFinanceStore'
import { formatCurrency } from '@/utils/formatters'
import { calculateAllBudgetStatus } from '@/utils/budgetManager'
import { migrateBeforeDeleteAccountBook } from '@/db/migrations'
import type { Tag, AccountBook, Budget, RecurringExpense, ExpenseTemplate, TagType } from '@/store/types'

export default function Settings() {
  const {
    tags,
    accountBooks,
    budgets,
    recurringExpenses,
    expenseTemplates,
    expenses,
    addTag,
    updateTag,
    deleteTag,
    addAccountBook,
    updateAccountBook,
    deleteAccountBook,
    setDefaultAccountBook,
    addBudget,
    updateBudget,
    deleteBudget,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    executeRecurringExpense,
    addExpenseTemplate,
    updateExpenseTemplate,
    deleteExpenseTemplate,
    addExpense,
    getCategoryTags,
    getLabelTags,
    getTagById,
  } = useFinanceStore()

  // 获取分类标签和普通标签
  const categoryTags = getCategoryTags()
  const labelTags = getLabelTags()

  // 当前打开的对话框
  const [activeDialog, setActiveDialog] = useState<string | null>(null)

  // ===== 标签管理状态 =====
  const [tagSearchQuery, setTagSearchQuery] = useState('')
  const [tagForm, setTagForm] = useState({
    name: '',
    color: '#3b82f6',
    type: 'label' as TagType,
    accountBookId: null as string | null
  })
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({
    'category-global': true,
    'label-global': true,
  })

  // ===== 账本管理状态 =====
  const [bookForm, setBookForm] = useState({ name: '', description: '', icon: '📚', color: '#3b82f6' })
  const [editingBook, setEditingBook] = useState<AccountBook | null>(null)
  const [deletingBook, setDeletingBook] = useState<AccountBook | null>(null)
  const [migrateTargetBookId, setMigrateTargetBookId] = useState<string>('')

  // ===== 预算管理状态 =====
  const [budgetForm, setBudgetForm] = useState({
    categoryTagId: null as string | null,
    amount: '',
    period: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    warningThreshold: 80,
    startDate: new Date().toISOString().split('T')[0],
  })
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  // ===== 周期性支出状态 =====
  const [recurringForm, setRecurringForm] = useState({
    name: '',
    categoryTagId: categoryTags[0]?.id || '',
    amount: '',
    description: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    monthOfYear: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    enabled: true,
    autoCreate: true,
  })
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null)

  // ===== 模板管理状态 =====
  const [templateForm, setTemplateForm] = useState({
    name: '',
    categoryTagId: categoryTags[0]?.id || '',
    amount: '',
    description: '',
    needsReimbursement: false,
  })
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null)

  // 计算每个账本的支出数量
  const bookExpenseCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    accountBooks.forEach(book => {
      counts[book.id] = expenses.filter(e => e.accountBookId === book.id).length
    })
    return counts
  }, [accountBooks, expenses])

  // 标签分组和筛选逻辑
  const groupedTags = useMemo(() => {
    // 根据搜索词筛选标签
    const filteredTags = tags.filter(tag =>
      tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
    )

    // 按类型分组
    const categoryTagsFiltered = filteredTags.filter(t => t.type === 'category')
    const labelTagsFiltered = filteredTags.filter(t => t.type === 'label')

    // 将每种类型的标签按账本分组
    const groupByAccountBook = (tagList: Tag[]) => {
      const global = tagList.filter(t => !t.accountBookId)
      const byBook: Record<string, Tag[]> = {}

      tagList.forEach(tag => {
        if (tag.accountBookId) {
          if (!byBook[tag.accountBookId]) {
            byBook[tag.accountBookId] = []
          }
          byBook[tag.accountBookId].push(tag)
        }
      })

      return { global, byBook }
    }

    return {
      category: groupByAccountBook(categoryTagsFiltered),
      label: groupByAccountBook(labelTagsFiltered),
    }
  }, [tags, tagSearchQuery])

  // 切换折叠面板
  const toggleCollapsible = (key: string) => {
    setOpenCollapsibles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 颜色选项
  const colorOptions = [
    { value: '#3b82f6', label: '蓝色' },
    { value: '#10b981', label: '绿色' },
    { value: '#f59e0b', label: '橙色' },
    { value: '#ef4444', label: '红色' },
    { value: '#8b5cf6', label: '紫色' },
    { value: '#ec4899', label: '粉色' },
    { value: '#14b8a6', label: '青色' },
    { value: '#f97316', label: '橘色' },
  ]

  // ===== 标签管理函数 =====
  const handleSaveTag = async () => {
    if (!tagForm.name.trim()) return

    if (editingTag) {
      await updateTag(editingTag.id, {
        name: tagForm.name,
        color: tagForm.color,
        type: tagForm.type,
        accountBookId: tagForm.accountBookId,
      })
    } else {
      await addTag({
        name: tagForm.name,
        color: tagForm.color,
        type: tagForm.type,
        accountBookId: tagForm.accountBookId || undefined,
        count: 0,
      })
    }

    setTagForm({ name: '', color: '#3b82f6', type: 'label', accountBookId: null })
    setEditingTag(null)
    setActiveDialog(null)
  }

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag)
    setTagForm({
      name: tag.name,
      color: tag.color,
      type: tag.type,
      accountBookId: tag.accountBookId || null
    })
    setActiveDialog('tag')
  }

  const handleDeleteTag = async (id: string) => {
    const tag = tags.find(t => t.id === id)
    if (!tag) return

    const confirmMessage = tag.type === 'category'
      ? '确定要删除这个分类标签吗？如果有支出使用此分类将无法删除。'
      : '确定要删除这个标签吗？将从所有支出中移除。'

    if (window.confirm(confirmMessage)) {
      try {
        await deleteTag(id)
      } catch (error) {
        alert((error as Error).message)
      }
    }
  }

  // ===== 账本管理函数 =====
  const handleSaveBook = async () => {
    if (!bookForm.name.trim()) return

    if (editingBook) {
      await updateAccountBook(editingBook.id, {
        name: bookForm.name,
        description: bookForm.description,
        icon: bookForm.icon,
        color: bookForm.color,
      })
    } else {
      await addAccountBook({
        name: bookForm.name,
        description: bookForm.description,
        icon: bookForm.icon,
        color: bookForm.color,
        isDefault: accountBooks.length === 0,
      })
    }

    setBookForm({ name: '', description: '', icon: '📚', color: '#3b82f6' })
    setEditingBook(null)
    setActiveDialog(null)
  }

  const handleEditBook = (book: AccountBook) => {
    setEditingBook(book)
    setBookForm({
      name: book.name,
      description: book.description || '',
      icon: book.icon,
      color: book.color,
    })
    setActiveDialog('book')
  }

  const handleDeleteBook = (book: AccountBook) => {
    if (book.isDefault) {
      alert('无法删除默认账本')
      return
    }
    // 打开删除确认对话框
    setDeletingBook(book)
    setMigrateTargetBookId('')
  }

  const handleConfirmDeleteBook = async () => {
    if (!deletingBook) return

    try {
      // 迁移数据
      if (migrateTargetBookId) {
        await migrateBeforeDeleteAccountBook(deletingBook.id, migrateTargetBookId)
      } else {
        await migrateBeforeDeleteAccountBook(deletingBook.id)
      }

      // 删除账本
      await deleteAccountBook(deletingBook.id)

      // 关闭对话框
      setDeletingBook(null)
      setMigrateTargetBookId('')
    } catch (error) {
      alert((error as Error).message)
    }
  }

  // ===== 预算管理函数 =====
  const handleSaveBudget = async () => {
    if (!budgetForm.amount) return

    if (editingBudget) {
      await updateBudget(editingBudget.id, {
        categoryTagId: budgetForm.categoryTagId,
        amount: parseFloat(budgetForm.amount),
        period: budgetForm.period,
        warningThreshold: budgetForm.warningThreshold,
        startDate: budgetForm.startDate,
      })
    } else {
      await addBudget({
        categoryTagId: budgetForm.categoryTagId,
        amount: parseFloat(budgetForm.amount),
        period: budgetForm.period,
        warningThreshold: budgetForm.warningThreshold,
        startDate: budgetForm.startDate,
      })
    }

    setBudgetForm({
      categoryTagId: null,
      amount: '',
      period: 'monthly',
      warningThreshold: 80,
      startDate: new Date().toISOString().split('T')[0],
    })
    setEditingBudget(null)
    setActiveDialog(null)
  }

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget)
    setBudgetForm({
      categoryTagId: budget.categoryTagId,
      amount: budget.amount.toString(),
      period: budget.period,
      warningThreshold: budget.warningThreshold,
      startDate: budget.startDate,
    })
    setActiveDialog('budget')
  }

  const handleDeleteBudget = async (id: string) => {
    if (window.confirm('确定要删除这个预算吗？')) {
      await deleteBudget(id)
    }
  }

  const budgetStatuses = calculateAllBudgetStatus(budgets, expenses)

  // ===== 周期性支出函数 =====
  const handleSaveRecurring = async () => {
    if (!recurringForm.name.trim() || !recurringForm.amount) return

    const data = {
      name: recurringForm.name,
      categoryTagId: recurringForm.categoryTagId,
      amount: parseFloat(recurringForm.amount),
      description: recurringForm.description,
      frequency: recurringForm.frequency,
      dayOfWeek: recurringForm.frequency === 'weekly' ? recurringForm.dayOfWeek : undefined,
      dayOfMonth: ['monthly', 'yearly'].includes(recurringForm.frequency) ? recurringForm.dayOfMonth : undefined,
      monthOfYear: recurringForm.frequency === 'yearly' ? recurringForm.monthOfYear : undefined,
      startDate: recurringForm.startDate,
      endDate: recurringForm.endDate || undefined,
      enabled: recurringForm.enabled,
      autoCreate: recurringForm.autoCreate,
    }

    if (editingRecurring) {
      await updateRecurringExpense(editingRecurring.id, data)
    } else {
      await addRecurringExpense(data)
    }

    setRecurringForm({
      name: '',
      categoryTagId: categoryTags[0]?.id || '',
      amount: '',
      description: '',
      frequency: 'monthly',
      dayOfWeek: 1,
      dayOfMonth: 1,
      monthOfYear: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      enabled: true,
      autoCreate: true,
    })
    setEditingRecurring(null)
    setActiveDialog(null)
  }

  const handleEditRecurring = (recurring: RecurringExpense) => {
    setEditingRecurring(recurring)
    setRecurringForm({
      name: recurring.name,
      categoryTagId: recurring.categoryTagId,
      amount: recurring.amount.toString(),
      description: recurring.description,
      frequency: recurring.frequency,
      dayOfWeek: recurring.dayOfWeek || 1,
      dayOfMonth: recurring.dayOfMonth || 1,
      monthOfYear: recurring.monthOfYear || 1,
      startDate: recurring.startDate,
      endDate: recurring.endDate || '',
      enabled: recurring.enabled,
      autoCreate: recurring.autoCreate,
    })
    setActiveDialog('recurring')
  }

  const handleDeleteRecurring = async (id: string) => {
    if (window.confirm('确定要删除这个周期性支出吗？')) {
      await deleteRecurringExpense(id)
    }
  }

  const handleExecuteRecurring = async (id: string) => {
    if (window.confirm('确定要立即执行这个周期性支出吗？将创建一笔支出记录。')) {
      await executeRecurringExpense(id)
      alert('周期性支出已执行！')
    }
  }

  // ===== 模板管理函数 =====
  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.amount) return

    if (editingTemplate) {
      await updateExpenseTemplate(editingTemplate.id, {
        name: templateForm.name,
        categoryTagId: templateForm.categoryTagId,
        amount: parseFloat(templateForm.amount),
        description: templateForm.description,
        needsReimbursement: templateForm.needsReimbursement,
      })
    } else {
      await addExpenseTemplate({
        name: templateForm.name,
        categoryTagId: templateForm.categoryTagId,
        amount: parseFloat(templateForm.amount),
        description: templateForm.description,
        needsReimbursement: templateForm.needsReimbursement,
      })
    }

    setTemplateForm({
      name: '',
      categoryTagId: categoryTags[0]?.id || '',
      amount: '',
      description: '',
      needsReimbursement: false,
    })
    setEditingTemplate(null)
    setActiveDialog(null)
  }

  const handleEditTemplate = (template: ExpenseTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      categoryTagId: template.categoryTagId,
      amount: template.amount.toString(),
      description: template.description,
      needsReimbursement: template.needsReimbursement,
    })
    setActiveDialog('template')
  }

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('确定要删除这个模板吗？')) {
      await deleteExpenseTemplate(id)
    }
  }

  const handleApplyTemplate = async (template: ExpenseTemplate) => {
    await addExpense({
      date: new Date().toISOString().split('T')[0],
      categoryTagId: template.categoryTagId,
      amount: template.amount,
      description: template.description,
      needsReimbursement: template.needsReimbursement,
      labelTagIds: template.labelTagIds,
    })
    alert('已根据模板创建支出记录！')
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto pb-20 md:pb-6 animate-in fade-in duration-500">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
          系统设置
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          管理标签、账本、预算、周期性支出和模板
        </p>
      </div>

      <Tabs defaultValue="tags" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-violet-200 dark:border-violet-700/50 p-1">
          <TabsTrigger
            value="tags"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:data-[state=active]:from-violet-500 dark:data-[state=active]:to-indigo-500 transition-all duration-300"
          >
            <TagIcon className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">标签</span>
          </TabsTrigger>
          <TabsTrigger
            value="books"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:data-[state=active]:from-violet-500 dark:data-[state=active]:to-indigo-500 transition-all duration-300"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">账本</span>
          </TabsTrigger>
          <TabsTrigger
            value="budgets"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:data-[state=active]:from-violet-500 dark:data-[state=active]:to-indigo-500 transition-all duration-300"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">预算</span>
          </TabsTrigger>
          <TabsTrigger
            value="recurring"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:data-[state=active]:from-violet-500 dark:data-[state=active]:to-indigo-500 transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">周期</span>
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:data-[state=active]:from-violet-500 dark:data-[state=active]:to-indigo-500 transition-all duration-300"
          >
            <FileText className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">模板</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== 标签管理 ===== */}
        <TabsContent value="tags" className="space-y-4 animate-in slide-in-from-bottom duration-500">
          <Card className="bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm border-violet-200 dark:border-violet-700/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                标签管理
              </CardTitle>
              <Dialog open={activeDialog === 'tag'} onOpenChange={(open) => {
                if (!open) {
                  setActiveDialog(null)
                  setEditingTag(null)
                  setTagForm({ name: '', color: '#3b82f6', icon: '🏷️', type: 'label', accountBookId: null })
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setActiveDialog('tag')}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新建标签
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl border-violet-200 dark:border-violet-700">
                  <DialogHeader>
                    <DialogTitle className="text-xl bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                      {editingTag ? '编辑标签' : '新建标签'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">标签类型</Label>
                      <select
                        value={tagForm.type}
                        onChange={(e) => setTagForm({ ...tagForm, type: e.target.value as TagType })}
                        className="flex h-10 w-full rounded-md border border-violet-200 dark:border-violet-700 bg-white/50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-violet-500 dark:focus:border-violet-400"
                      >
                        <option value="category">分类标签（用于支出分类）</option>
                        <option value="label">普通标签（用于多维标记）</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">所属账本</Label>
                      <select
                        value={tagForm.accountBookId || ''}
                        onChange={(e) => setTagForm({ ...tagForm, accountBookId: e.target.value || null })}
                        className="flex h-10 w-full rounded-md border border-violet-200 dark:border-violet-700 bg-white/50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-violet-500 dark:focus:border-violet-400"
                      >
                        <option value="">全局标签（所有账本可用）</option>
                        {accountBooks.map((book) => (
                          <option key={book.id} value={book.id}>
                            {book.icon} {book.name}（账本专属）
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        全局标签在所有账本中可用，账本专属标签只在指定账本中显示
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">标签名称</Label>
                      <Input
                        value={tagForm.name}
                        onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                        placeholder="输入标签名称"
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">颜色</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => setTagForm({ ...tagForm, color: color.value })}
                            className={`p-3 rounded-lg border-2 transition-all duration-300 flex items-center gap-2 hover:scale-105 ${
                              tagForm.color === color.value
                                ? 'border-violet-500 dark:border-violet-400 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 shadow-lg'
                                : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 bg-white/50 dark:bg-slate-800/50'
                            }`}
                          >
                            <Circle className="w-4 h-4" fill={color.value} color={color.value} />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{color.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSaveTag}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {editingTag ? '保存' : '创建'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveDialog(null)
                          setEditingTag(null)
                          setTagForm({ name: '', color: '#3b82f6', icon: '🏷️', type: 'label' })
                        }}
                        className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 搜索栏 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  placeholder="搜索标签..."
                  className="pl-10 border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                />
              </div>

              {tags.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  暂无标签，点击"新建标签"创建第一个标签
                </div>
              ) : (
                <Tabs defaultValue="category" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-violet-200 dark:border-violet-700/50 p-1">
                    <TabsTrigger
                      value="category"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:data-[state=active]:from-violet-500 dark:data-[state=active]:to-indigo-500 transition-all duration-300"
                    >
                      分类标签
                    </TabsTrigger>
                    <TabsTrigger
                      value="label"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:data-[state=active]:from-violet-500 dark:data-[state=active]:to-indigo-500 transition-all duration-300"
                    >
                      普通标签
                    </TabsTrigger>
                  </TabsList>

                  {/* 分类标签 Tab */}
                  <TabsContent value="category" className="space-y-3 mt-4">
                    {groupedTags.category.global.length === 0 && Object.keys(groupedTags.category.byBook).length === 0 ? (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        暂无分类标签
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* 全局分类标签 */}
                        {groupedTags.category.global.length > 0 && (
                          <Collapsible
                            open={openCollapsibles['category-global']}
                            onOpenChange={() => toggleCollapsible('category-global')}
                          >
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 hover:from-violet-100 hover:to-indigo-100 dark:hover:from-violet-900/50 dark:hover:to-indigo-900/50 transition-all duration-300 border border-violet-200 dark:border-violet-700/50">
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  🌍 全局标签 ({groupedTags.category.global.length})
                                </span>
                                {openCollapsibles['category-global'] ? (
                                  <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                )}
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {groupedTags.category.global.map((tag) => (
                                  <Card
                                    key={tag.id}
                                    className="bg-gradient-to-br from-white/60 to-slate-50/60 dark:from-slate-800/60 dark:to-slate-900/60 backdrop-blur-sm border-violet-100 dark:border-violet-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate" style={{ color: tag.color }}>
                                              {tag.name}
                                            </div>
                                            <div className="text-xs">
                                              <span className="text-slate-500 dark:text-slate-400">使用: </span>
                                              <span className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                                {tag.count || 0}
                                              </span>
                                              <span className="text-slate-500 dark:text-slate-400"> 次</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditTag(tag)}
                                            className="hover:bg-violet-100 dark:hover:bg-violet-900/30 h-8 w-8"
                                          >
                                            <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteTag(tag.id)}
                                            className="hover:bg-rose-100 dark:hover:bg-rose-900/30 h-8 w-8"
                                          >
                                            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {/* 账本专属分类标签 */}
                        {Object.entries(groupedTags.category.byBook).map(([bookId, bookTags]) => {
                          const book = accountBooks.find(b => b.id === bookId)
                          if (!book) return null

                          const key = `category-book-${bookId}`
                          return (
                            <Collapsible
                              key={key}
                              open={openCollapsibles[key] !== false}
                              onOpenChange={() => toggleCollapsible(key)}
                            >
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 hover:from-violet-100 hover:to-indigo-100 dark:hover:from-violet-900/50 dark:hover:to-indigo-900/50 transition-all duration-300 border border-violet-200 dark:border-violet-700/50">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {book.icon} {book.name} ({bookTags.length})
                                  </span>
                                  {openCollapsibles[key] !== false ? (
                                    <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                  )}
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {bookTags.map((tag) => (
                                    <Card
                                      key={tag.id}
                                      className="bg-gradient-to-br from-white/60 to-slate-50/60 dark:from-slate-800/60 dark:to-slate-900/60 backdrop-blur-sm border-violet-100 dark:border-violet-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                    >
                                      <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="flex-1 min-w-0">
                                              <div className="font-medium truncate" style={{ color: tag.color }}>
                                                {tag.name}
                                              </div>
                                              <div className="text-xs">
                                                <span className="text-slate-500 dark:text-slate-400">使用: </span>
                                                <span className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                                  {tag.count || 0}
                                                </span>
                                                <span className="text-slate-500 dark:text-slate-400"> 次</span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex gap-1 ml-2">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleEditTag(tag)}
                                              className="hover:bg-violet-100 dark:hover:bg-violet-900/30 h-8 w-8"
                                            >
                                              <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleDeleteTag(tag.id)}
                                              className="hover:bg-rose-100 dark:hover:bg-rose-900/30 h-8 w-8"
                                            >
                                              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                            </Button>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* 普通标签 Tab */}
                  <TabsContent value="label" className="space-y-3 mt-4">
                    {groupedTags.label.global.length === 0 && Object.keys(groupedTags.label.byBook).length === 0 ? (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        暂无普通标签
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* 全局普通标签 */}
                        {groupedTags.label.global.length > 0 && (
                          <Collapsible
                            open={openCollapsibles['label-global']}
                            onOpenChange={() => toggleCollapsible('label-global')}
                          >
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 hover:from-violet-100 hover:to-indigo-100 dark:hover:from-violet-900/50 dark:hover:to-indigo-900/50 transition-all duration-300 border border-violet-200 dark:border-violet-700/50">
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  🌍 全局标签 ({groupedTags.label.global.length})
                                </span>
                                {openCollapsibles['label-global'] ? (
                                  <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                )}
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {groupedTags.label.global.map((tag) => (
                                  <Card
                                    key={tag.id}
                                    className="bg-gradient-to-br from-white/60 to-slate-50/60 dark:from-slate-800/60 dark:to-slate-900/60 backdrop-blur-sm border-violet-100 dark:border-violet-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate" style={{ color: tag.color }}>
                                              {tag.name}
                                            </div>
                                            <div className="text-xs">
                                              <span className="text-slate-500 dark:text-slate-400">使用: </span>
                                              <span className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                                {tag.count || 0}
                                              </span>
                                              <span className="text-slate-500 dark:text-slate-400"> 次</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditTag(tag)}
                                            className="hover:bg-violet-100 dark:hover:bg-violet-900/30 h-8 w-8"
                                          >
                                            <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteTag(tag.id)}
                                            className="hover:bg-rose-100 dark:hover:bg-rose-900/30 h-8 w-8"
                                          >
                                            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {/* 账本专属普通标签 */}
                        {Object.entries(groupedTags.label.byBook).map(([bookId, bookTags]) => {
                          const book = accountBooks.find(b => b.id === bookId)
                          if (!book) return null

                          const key = `label-book-${bookId}`
                          return (
                            <Collapsible
                              key={key}
                              open={openCollapsibles[key] !== false}
                              onOpenChange={() => toggleCollapsible(key)}
                            >
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 hover:from-violet-100 hover:to-indigo-100 dark:hover:from-violet-900/50 dark:hover:to-indigo-900/50 transition-all duration-300 border border-violet-200 dark:border-violet-700/50">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {book.icon} {book.name} ({bookTags.length})
                                  </span>
                                  {openCollapsibles[key] !== false ? (
                                    <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                  )}
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {bookTags.map((tag) => (
                                    <Card
                                      key={tag.id}
                                      className="bg-gradient-to-br from-white/60 to-slate-50/60 dark:from-slate-800/60 dark:to-slate-900/60 backdrop-blur-sm border-violet-100 dark:border-violet-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                    >
                                      <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="flex-1 min-w-0">
                                              <div className="font-medium truncate" style={{ color: tag.color }}>
                                                {tag.name}
                                              </div>
                                              <div className="text-xs">
                                                <span className="text-slate-500 dark:text-slate-400">使用: </span>
                                                <span className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                                  {tag.count || 0}
                                                </span>
                                                <span className="text-slate-500 dark:text-slate-400"> 次</span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex gap-1 ml-2">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleEditTag(tag)}
                                              className="hover:bg-violet-100 dark:hover:bg-violet-900/30 h-8 w-8"
                                            >
                                              <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleDeleteTag(tag.id)}
                                              className="hover:bg-rose-100 dark:hover:bg-rose-900/30 h-8 w-8"
                                            >
                                              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                            </Button>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 账本管理 ===== */}
        <TabsContent value="books" className="space-y-4 animate-in slide-in-from-bottom duration-500">
          <Card className="bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm border-violet-200 dark:border-violet-700/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                账本管理
              </CardTitle>
              <Dialog open={activeDialog === 'book'} onOpenChange={(open) => {
                if (!open) {
                  setActiveDialog(null)
                  setEditingBook(null)
                  setBookForm({ name: '', description: '', icon: '📚', color: '#3b82f6' })
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setActiveDialog('book')}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新建账本
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl border-violet-200 dark:border-violet-700">
                  <DialogHeader>
                    <DialogTitle className="text-xl bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                      {editingBook ? '编辑账本' : '新建账本'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">账本名称</Label>
                      <Input
                        value={bookForm.name}
                        onChange={(e) => setBookForm({ ...bookForm, name: e.target.value })}
                        placeholder="例如: 个人账本"
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">描述（可选）</Label>
                      <Input
                        value={bookForm.description}
                        onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                        placeholder="账本描述"
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">图标</Label>
                      <div className="grid grid-cols-6 gap-2 mt-2">
                        {['📚', '💼', '🏠', '✈️', '🎓', '🏥', '🛒', '💳', '🎁', '🚗', '🍔', '🎮'].map((icon) => (
                          <button
                            key={icon}
                            onClick={() => setBookForm({ ...bookForm, icon })}
                            className={`p-2 text-2xl rounded-lg border-2 transition-all duration-300 hover:scale-110 ${
                              bookForm.icon === icon
                                ? 'border-violet-500 dark:border-violet-400 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 shadow-lg'
                                : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 bg-white/50 dark:bg-slate-800/50'
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">颜色</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => setBookForm({ ...bookForm, color: color.value })}
                            className={`p-3 rounded-lg border-2 transition-all duration-300 flex items-center gap-2 hover:scale-105 ${
                              bookForm.color === color.value
                                ? 'border-violet-500 dark:border-violet-400 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 shadow-lg'
                                : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 bg-white/50 dark:bg-slate-800/50'
                            }`}
                          >
                            <Circle className="w-4 h-4" fill={color.value} color={color.value} />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{color.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSaveBook}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {editingBook ? '保存' : '创建'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveDialog(null)
                          setEditingBook(null)
                          setBookForm({ name: '', description: '', icon: '📚', color: '#3b82f6' })
                        }}
                        className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {accountBooks.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  暂无账本，点击"新建账本"创建第一个账本
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {accountBooks.map((book) => (
                    <Card
                      key={book.id}
                      className="bg-gradient-to-br from-white/60 to-slate-50/60 dark:from-slate-800/60 dark:to-slate-900/60 backdrop-blur-sm border-violet-100 dark:border-violet-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-3xl">{book.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="font-medium"
                                  style={{ color: book.color }}
                                >
                                  {book.name}
                                </span>
                                {book.isDefault && (
                                  <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-700">
                                    默认
                                  </span>
                                )}
                              </div>
                              {book.description && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{book.description}</div>
                              )}
                              <div className="text-xs mt-1">
                                <span className="text-slate-500 dark:text-slate-400">支出: </span>
                                <span className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                  {bookExpenseCounts[book.id] || 0}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400"> 笔</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            {!book.isDefault && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDefaultAccountBook(book.id)}
                                className="text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300"
                              >
                                设为默认
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditBook(book)}
                              className="hover:bg-violet-100 dark:hover:bg-violet-900/30 h-8 w-8"
                            >
                              <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBook(book)}
                              className="hover:bg-rose-100 dark:hover:bg-rose-900/30 h-8 w-8"
                              disabled={book.isDefault}
                            >
                              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 删除账本确认对话框 */}
          <Dialog open={deletingBook !== null} onOpenChange={(open) => !open && setDeletingBook(null)}>
            <DialogContent className="bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl border-rose-200 dark:border-rose-700">
              <DialogHeader>
                <DialogTitle className="text-xl bg-gradient-to-r from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400 bg-clip-text text-transparent flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  删除账本确认
                </DialogTitle>
              </DialogHeader>
              {deletingBook && (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      您即将删除账本：
                      <span className="font-bold ml-1" style={{ color: deletingBook.color }}>
                        {deletingBook.icon} {deletingBook.name}
                      </span>
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                      该账本包含
                      <span className="font-bold text-rose-600 dark:text-rose-400 mx-1">
                        {bookExpenseCounts[deletingBook.id] || 0}
                      </span>
                      笔支出记录
                    </p>
                  </div>

                  {bookExpenseCounts[deletingBook.id] > 0 && (
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300 mb-2 block">
                        数据迁移选项
                      </Label>
                      <select
                        value={migrateTargetBookId}
                        onChange={(e) => setMigrateTargetBookId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-rose-200 dark:border-rose-700 bg-white/50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-rose-500 dark:focus:border-rose-400"
                      >
                        <option value="">清除账本关联（支出仍保留）</option>
                        {accountBooks
                          .filter(b => b.id !== deletingBook.id)
                          .map(book => (
                            <option key={book.id} value={book.id}>
                              迁移到：{book.icon} {book.name}
                            </option>
                          ))}
                      </select>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {migrateTargetBookId
                          ? '支出将被迁移到选定的账本'
                          : '支出的账本关联将被清除，但记录仍会保留'}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleConfirmDeleteBook}
                      className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 dark:from-rose-500 dark:to-red-500 dark:hover:from-rose-600 dark:hover:to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      确认删除
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDeletingBook(null)
                        setMigrateTargetBookId('')
                      }}
                      className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== 预算管理 ===== */}
        <TabsContent value="budgets" className="space-y-4 animate-in slide-in-from-bottom duration-500">
          <Card className="bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm border-violet-200 dark:border-violet-700/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                预算管理
              </CardTitle>
              <Dialog open={activeDialog === 'budget'} onOpenChange={(open) => {
                if (!open) {
                  setActiveDialog(null)
                  setEditingBudget(null)
                  setBudgetForm({
                    categoryTagId: null,
                    amount: '',
                    period: 'monthly',
                    warningThreshold: 80,
                    startDate: new Date().toISOString().split('T')[0],
                  })
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setActiveDialog('budget')}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新建预算
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl border-violet-200 dark:border-violet-700">
                  <DialogHeader>
                    <DialogTitle className="text-xl bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                      {editingBudget ? '编辑预算' : '新建预算'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">预算类别</Label>
                      <select
                        value={budgetForm.categoryTagId || ''}
                        onChange={(e) => setBudgetForm({ ...budgetForm, categoryTagId: e.target.value || null })}
                        className="flex h-10 w-full rounded-md border border-violet-200 dark:border-violet-700 bg-white/50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-violet-500 dark:focus:border-violet-400"
                      >
                        <option value="">总预算（不限分类）</option>
                        {categoryTags.map((tag) => (
                          <option key={tag.id} value={tag.id}>
                            {tag.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">预算金额</Label>
                      <Input
                        type="number"
                        value={budgetForm.amount}
                        onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })}
                        placeholder="输入预算金额"
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">预算周期</Label>
                      <select
                        value={budgetForm.period}
                        onChange={(e) => setBudgetForm({ ...budgetForm, period: e.target.value as any })}
                        className="flex h-10 w-full rounded-md border border-violet-200 dark:border-violet-700 bg-white/50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-violet-500 dark:focus:border-violet-400"
                      >
                        <option value="daily">每日</option>
                        <option value="weekly">每周</option>
                        <option value="monthly">每月</option>
                        <option value="yearly">每年</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">
                        预警阈值 (
                        <span className="font-semibold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                          {budgetForm.warningThreshold}%
                        </span>
                        )
                      </Label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={budgetForm.warningThreshold}
                        onChange={(e) => setBudgetForm({ ...budgetForm, warningThreshold: parseInt(e.target.value) })}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600 dark:accent-violet-400"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">开始日期</Label>
                      <Input
                        type="date"
                        value={budgetForm.startDate}
                        onChange={(e) => setBudgetForm({ ...budgetForm, startDate: e.target.value })}
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSaveBudget}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {editingBudget ? '保存' : '创建'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveDialog(null)
                          setEditingBudget(null)
                          setBudgetForm({
                            categoryTagId: null,
                            amount: '',
                            period: 'monthly',
                            warningThreshold: 80,
                            startDate: new Date().toISOString().split('T')[0],
                          })
                        }}
                        className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {budgets.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  暂无预算，点击"新建预算"创建第一个预算
                </div>
              ) : (
                <div className="space-y-3">
                  {budgetStatuses.map((status) => {
                    const gradientClass =
                      status.status === 'exceeded'
                        ? 'from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400'
                        : status.status === 'warning'
                        ? 'from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400'
                        : 'from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400'

                    const bgClass =
                      status.status === 'exceeded'
                        ? 'from-rose-100 to-red-100 dark:from-rose-900/50 dark:to-red-900/50 border-rose-300 dark:border-rose-700'
                        : status.status === 'warning'
                        ? 'from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 border-amber-300 dark:border-amber-700'
                        : 'from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50 border-emerald-300 dark:border-emerald-700'

                    const progressGradient =
                      status.status === 'exceeded'
                        ? 'from-rose-600 to-red-600'
                        : status.status === 'warning'
                        ? 'from-amber-500 to-orange-500'
                        : 'from-emerald-600 to-green-600'

                    return (
                      <Card
                        key={status.budget.id}
                        className="bg-gradient-to-br from-white/60 to-slate-50/60 dark:from-slate-800/60 dark:to-slate-900/60 backdrop-blur-sm border-violet-100 dark:border-violet-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-lg text-slate-800 dark:text-slate-200">
                                  {status.budget.categoryTagId ? getTagById(status.budget.categoryTagId)?.name : '总预算'}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                  {
                                    status.budget.period === 'daily' ? '每日预算' :
                                    status.budget.period === 'weekly' ? '每周预算' :
                                    status.budget.period === 'monthly' ? '每月预算' : '每年预算'
                                  }
                                  <span className="mx-1">·</span>
                                  <span className="font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                                    剩余 {status.daysLeft} 天
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${bgClass} border`}>
                                  <span className={`bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}>
                                    {status.percentage.toFixed(0)}%
                                  </span>
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditBudget(status.budget)}
                                  className="hover:bg-violet-100 dark:hover:bg-violet-900/30 h-8 w-8"
                                >
                                  <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteBudget(status.budget.id)}
                                  className="hover:bg-rose-100 dark:hover:bg-rose-900/30 h-8 w-8"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-600 dark:text-slate-400">
                                  已花费: <span className={`font-semibold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}>{formatCurrency(status.spent)}</span>
                                </span>
                                <span className="text-slate-600 dark:text-slate-400">
                                  预算: <span className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">{formatCurrency(status.budget.amount)}</span>
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
                                <div
                                  className={`h-full transition-all duration-500 bg-gradient-to-r ${progressGradient} rounded-full`}
                                  style={{ width: `${Math.min(100, status.percentage)}%` }}
                                />
                              </div>
                              <div className="text-xs mt-2">
                                <span className="text-slate-500 dark:text-slate-400">剩余: </span>
                                <span className={`font-semibold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}>
                                  {formatCurrency(status.remaining)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 周期性支出 ===== */}
        <TabsContent value="recurring" className="space-y-4 animate-in slide-in-from-bottom duration-500">
          <Card className="bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm border-violet-200 dark:border-violet-700/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                周期性支出
              </CardTitle>
              <Dialog open={activeDialog === 'recurring'} onOpenChange={(open) => {
                if (!open) {
                  setActiveDialog(null)
                  setEditingRecurring(null)
                  setRecurringForm({
                    name: '',
                    categoryTagId: categoryTags[0]?.id || '',
                    amount: '',
                    description: '',
                    frequency: 'monthly',
                    dayOfWeek: 1,
                    dayOfMonth: 1,
                    monthOfYear: 1,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: '',
                    enabled: true,
                    autoCreate: true,
                  })
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setActiveDialog('recurring')}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新建周期性支出
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl border-violet-200 dark:border-violet-700">
                  <DialogHeader>
                    <DialogTitle className="text-xl bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                      {editingRecurring ? '编辑周期性支出' : '新建周期性支出'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">名称</Label>
                      <Input
                        value={recurringForm.name}
                        onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })}
                        placeholder="例如: 房租"
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">分类</Label>
                      <select
                        value={recurringForm.categoryTagId}
                        onChange={(e) => setRecurringForm({ ...recurringForm, categoryTagId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-violet-200 dark:border-violet-700 bg-white/50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-violet-500 dark:focus:border-violet-400"
                      >
                        {categoryTags.map((tag) => (
                          <option key={tag.id} value={tag.id}>
                            {tag.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">金额</Label>
                      <Input
                        type="number"
                        value={recurringForm.amount}
                        onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                        placeholder="输入金额"
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">描述</Label>
                      <Input
                        value={recurringForm.description}
                        onChange={(e) => setRecurringForm({ ...recurringForm, description: e.target.value })}
                        placeholder="支出描述"
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">频率</Label>
                      <select
                        value={recurringForm.frequency}
                        onChange={(e) => setRecurringForm({ ...recurringForm, frequency: e.target.value as any })}
                        className="flex h-10 w-full rounded-md border border-violet-200 dark:border-violet-700 bg-white/50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-violet-500 dark:focus:border-violet-400"
                      >
                        <option value="daily">每天</option>
                        <option value="weekly">每周</option>
                        <option value="monthly">每月</option>
                        <option value="yearly">每年</option>
                      </select>
                    </div>

                    {recurringForm.frequency === 'weekly' && (
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300">星期几</Label>
                        <select
                          value={recurringForm.dayOfWeek}
                          onChange={(e) => setRecurringForm({ ...recurringForm, dayOfWeek: parseInt(e.target.value) })}
                          className="flex h-10 w-full rounded-md border border-violet-200 dark:border-violet-700 bg-white/50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-violet-500 dark:focus:border-violet-400"
                        >
                          <option value="0">星期日</option>
                          <option value="1">星期一</option>
                          <option value="2">星期二</option>
                          <option value="3">星期三</option>
                          <option value="4">星期四</option>
                          <option value="5">星期五</option>
                          <option value="6">星期六</option>
                        </select>
                      </div>
                    )}

                    {(recurringForm.frequency === 'monthly' || recurringForm.frequency === 'yearly') && (
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300">几号</Label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={recurringForm.dayOfMonth}
                          onChange={(e) => setRecurringForm({ ...recurringForm, dayOfMonth: parseInt(e.target.value) })}
                          className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                        />
                      </div>
                    )}

                    {recurringForm.frequency === 'yearly' && (
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300">几月</Label>
                        <select
                          value={recurringForm.monthOfYear}
                          onChange={(e) => setRecurringForm({ ...recurringForm, monthOfYear: parseInt(e.target.value) })}
                          className="flex h-10 w-full rounded-md border border-violet-200 dark:border-violet-700 bg-white/50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-violet-500 dark:focus:border-violet-400"
                        >
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                            <option key={m} value={m}>{m}月</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">开始日期</Label>
                      <Input
                        type="date"
                        value={recurringForm.startDate}
                        onChange={(e) => setRecurringForm({ ...recurringForm, startDate: e.target.value })}
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">结束日期（可选）</Label>
                      <Input
                        type="date"
                        value={recurringForm.endDate}
                        onChange={(e) => setRecurringForm({ ...recurringForm, endDate: e.target.value })}
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="enabled"
                        checked={recurringForm.enabled}
                        onChange={(e) => setRecurringForm({ ...recurringForm, enabled: e.target.checked })}
                        className="w-4 h-4 accent-violet-600 dark:accent-violet-400"
                      />
                      <Label htmlFor="enabled" className="cursor-pointer text-slate-700 dark:text-slate-300">启用此周期性支出</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoCreate"
                        checked={recurringForm.autoCreate}
                        onChange={(e) => setRecurringForm({ ...recurringForm, autoCreate: e.target.checked })}
                        className="w-4 h-4 accent-violet-600 dark:accent-violet-400"
                      />
                      <Label htmlFor="autoCreate" className="cursor-pointer text-slate-700 dark:text-slate-300">自动创建支出记录</Label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSaveRecurring}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {editingRecurring ? '保存' : '创建'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveDialog(null)
                          setEditingRecurring(null)
                        }}
                        className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {recurringExpenses.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  暂无周期性支出，点击"新建周期性支出"创建第一个
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringExpenses.map((recurring) => (
                    <Card
                      key={recurring.id}
                      className="bg-gradient-to-br from-white/60 to-slate-50/60 dark:from-slate-800/60 dark:to-slate-900/60 backdrop-blur-sm border-violet-100 dark:border-violet-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium text-lg text-slate-800 dark:text-slate-200">{recurring.name}</span>
                              {recurring.enabled ? (
                                <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-700">
                                  ✓ 启用
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full border border-slate-300 dark:border-slate-600">
                                  ✗ 禁用
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              <span className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                {formatCurrency(recurring.amount)}
                              </span>
                              <span className="mx-1">·</span>
                              {recurring.description}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {
                                recurring.frequency === 'daily' ? '每天' :
                                recurring.frequency === 'weekly' ? `每周${['日','一','二','三','四','五','六'][recurring.dayOfWeek || 0]}` :
                                recurring.frequency === 'monthly' ? `每月${recurring.dayOfMonth}号` :
                                `每年${recurring.monthOfYear}月${recurring.dayOfMonth}号`
                              }
                              {recurring.lastExecuted && (
                                <span>
                                  <span className="mx-1">·</span>
                                  上次: <span className="font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">{recurring.lastExecuted}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 items-center">
                            <Button
                              size="sm"
                              onClick={() => handleExecuteRecurring(recurring.id)}
                              disabled={!recurring.enabled}
                              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 dark:from-emerald-500 dark:to-green-500 dark:hover:from-emerald-600 dark:hover:to-green-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              立即执行
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRecurring(recurring)}
                              className="hover:bg-violet-100 dark:hover:bg-violet-900/30 h-8 w-8"
                            >
                              <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRecurring(recurring.id)}
                              className="hover:bg-rose-100 dark:hover:bg-rose-900/30 h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 模板管理 ===== */}
        <TabsContent value="templates" className="space-y-4 animate-in slide-in-from-bottom duration-500">
          <Card className="bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm border-violet-200 dark:border-violet-700/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                支出模板
              </CardTitle>
              <Dialog open={activeDialog === 'template'} onOpenChange={(open) => {
                if (!open) {
                  setActiveDialog(null)
                  setEditingTemplate(null)
                  setTemplateForm({
                    name: '',
                    categoryTagId: categoryTags[0]?.id || '',
                    amount: '',
                    description: '',
                    needsReimbursement: false,
                  })
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setActiveDialog('template')}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新建模板
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl border-violet-200 dark:border-violet-700">
                  <DialogHeader>
                    <DialogTitle className="text-xl bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                      {editingTemplate ? '编辑模板' : '新建模板'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">模板名称</Label>
                      <Input
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        placeholder="例如: 工作日午餐"
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">分类</Label>
                      <select
                        value={templateForm.categoryTagId}
                        onChange={(e) => setTemplateForm({ ...templateForm, categoryTagId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-violet-200 dark:border-violet-700 bg-white/50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-violet-500 dark:focus:border-violet-400"
                      >
                        {categoryTags.map((tag) => (
                          <option key={tag.id} value={tag.id}>
                            {tag.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">金额</Label>
                      <Input
                        type="number"
                        value={templateForm.amount}
                        onChange={(e) => setTemplateForm({ ...templateForm, amount: e.target.value })}
                        placeholder="输入金额"
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">描述</Label>
                      <Input
                        value={templateForm.description}
                        onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                        placeholder="支出描述"
                        className="border-violet-200 dark:border-violet-700 focus:border-violet-500 dark:focus:border-violet-400 bg-white/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="needsReimbursement"
                        checked={templateForm.needsReimbursement}
                        onChange={(e) => setTemplateForm({ ...templateForm, needsReimbursement: e.target.checked })}
                        className="w-4 h-4 accent-violet-600 dark:accent-violet-400"
                      />
                      <Label htmlFor="needsReimbursement" className="cursor-pointer text-slate-700 dark:text-slate-300">需要报销</Label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSaveTemplate}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {editingTemplate ? '保存' : '创建'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveDialog(null)
                          setEditingTemplate(null)
                        }}
                        className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {expenseTemplates.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  暂无模板，点击"新建模板"创建第一个模板
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {expenseTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="bg-gradient-to-br from-white/60 to-slate-50/60 dark:from-slate-800/60 dark:to-slate-900/60 backdrop-blur-sm border-violet-100 dark:border-violet-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-lg mb-1 text-slate-800 dark:text-slate-200">
                              {template.name}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              {getTagById(template.categoryTagId)?.name || '未知分类'}
                              <span className="mx-1">·</span>
                              <span className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                {formatCurrency(template.amount)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {template.description}
                            </div>
                          </div>
                          <div className="flex gap-1 items-center">
                            <Button
                              size="sm"
                              onClick={() => handleApplyTemplate(template)}
                              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 dark:from-emerald-500 dark:to-green-500 dark:hover:from-emerald-600 dark:hover:to-green-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              应用
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTemplate(template)}
                              className="hover:bg-violet-100 dark:hover:bg-violet-900/30 h-8 w-8"
                            >
                              <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="hover:bg-rose-100 dark:hover:bg-rose-900/30 h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
