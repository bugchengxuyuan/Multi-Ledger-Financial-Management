import { useState } from 'react'
import { Plus, Edit, Trash2, Check, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useFinanceStore } from '@/store/useFinanceStore'
import { formatCurrency } from '@/utils/formatters'
import type { AccountBook } from '@/store/types'

const iconOptions = ['📚', '💰', '🏠', '🛒', '💼', '🎮', '✈️', '🎓', '🏥', '🚗']
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

export default function AccountBooks() {
  const {
    accountBooks,
    addAccountBook,
    updateAccountBook,
    deleteAccountBook,
    setDefaultAccountBook,
    transactions,
  } = useFinanceStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<AccountBook | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: '📚',
    color: '#3b82f6',
    initialBalance: 0,
  })

  const resetForm = () => {
    setForm({ name: '', description: '', icon: '📚', color: '#3b82f6', initialBalance: 0 })
    setEditingBook(null)
  }

  const handleOpenDialog = (book?: AccountBook) => {
    if (book) {
      setEditingBook(book)
      setForm({
        name: book.name,
        description: book.description || '',
        icon: book.icon,
        color: book.color,
        initialBalance: book.initialBalance,
      })
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return

    try {
      if (editingBook) {
        await updateAccountBook(editingBook.id, {
          name: form.name,
          description: form.description,
          icon: form.icon,
          color: form.color,
          initialBalance: form.initialBalance,
        })
      } else {
        await addAccountBook({
          name: form.name,
          description: form.description,
          icon: form.icon,
          color: form.color,
          isDefault: accountBooks.length === 0,
          initialBalance: form.initialBalance,
          currentBalance: form.initialBalance,
          balanceMode: 'auto',
        })
      }
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const handleDelete = async (book: AccountBook) => {
    if (book.isDefault) {
      alert('无法删除默认账本')
      return
    }
    if (window.confirm(`确定要删除账本"${book.name}"吗？该账本下的交易将变为无账本状态。`)) {
      try {
        await deleteAccountBook(book.id)
      } catch (error) {
        alert((error as Error).message)
      }
    }
  }

  const handleSetDefault = async (bookId: string) => {
    try {
      await setDefaultAccountBook(bookId)
    } catch (error) {
      alert((error as Error).message)
    }
  }

  // 计算每个账本的交易数量和余额
  const getBookStats = (bookId: string) => {
    const bookTransactions = transactions.filter(t => t.accountBookId === bookId)
    const transactionCount = bookTransactions.length
    const income = bookTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const expense = bookTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    return { transactionCount, income, expense, balance: income - expense }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">账本管理</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">管理你的多个账本</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              新建账本
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingBook ? '编辑账本' : '新建账本'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>账本名称 *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="如：个人账本、家庭账本"
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="可选描述"
                />
              </div>
              <div className="space-y-2">
                <Label>期初余额</Label>
                <Input
                  type="number"
                  value={form.initialBalance}
                  onChange={e => setForm({ ...form, initialBalance: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>图标</Label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setForm({ ...form, icon })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        form.icon === icon
                          ? 'ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-900/30'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>颜色</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setForm({ ...form, color: color.value })}
                      className={`w-8 h-8 rounded-full transition-all ${
                        form.color === color.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingBook ? '保存修改' : '创建账本'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {accountBooks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-4">还没有账本，创建一个开始记账吧</p>
            <Button onClick={() => handleOpenDialog()} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              创建第一个账本
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accountBooks.map(book => {
            const stats = getBookStats(book.id)
            return (
              <Card
                key={book.id}
                className="relative overflow-hidden hover:shadow-md transition-shadow"
                style={{ borderLeftWidth: '4px', borderLeftColor: book.color }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{book.icon}</span>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {book.name}
                          {book.isDefault && (
                            <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full">
                              默认
                            </span>
                          )}
                        </CardTitle>
                        {book.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">{book.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!book.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(book.id)}
                          title="设为默认"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(book)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!book.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(book)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex gap-4">
                      <span className="text-slate-500 dark:text-slate-400">
                        {stats.transactionCount} 笔交易
                      </span>
                      <span className="text-green-600 dark:text-green-400">
                        收入 {formatCurrency(stats.income)}
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        支出 {formatCurrency(stats.expense)}
                      </span>
                    </div>
                    <div className="text-lg font-semibold" style={{ color: stats.balance >= 0 ? '#10b981' : '#ef4444' }}>
                      {formatCurrency(book.initialBalance + stats.balance)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
