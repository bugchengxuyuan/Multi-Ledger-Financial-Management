import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { QuickAddDialog } from '@/components/QuickAddDialog'
import { useFinanceStore } from '@/store/useFinanceStore'
import { toNumber, formatCurrency } from '@/utils/formatters'
import { Plus, Receipt, Wallet, TrendingDown } from 'lucide-react'
import type { AccountBook, TransactionType } from '@/store/types'

interface TikTokBookViewProps {
  accountBook: AccountBook
}

export function TikTokBookView({ accountBook }: TikTokBookViewProps) {
  const { transactions, reimbursements, budgets } = useFinanceStore()

  // Dialog state for quick actions
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<TransactionType>('expense')
  const [needsReimbursement, setNeedsReimbursement] = useState(false)

  // Handle quick action buttons
  const handleQuickAction = (type: TransactionType, reimbursement: boolean = false) => {
    setDialogType(type)
    setNeedsReimbursement(reimbursement)
    setDialogOpen(true)
  }

  // 筛选当前账本的数据
  const bookTransactions = useMemo(() =>
    transactions.filter(t => t.accountBookId === accountBook.id),
    [transactions, accountBook.id]
  )

  const bookReimbursements = useMemo(() =>
    reimbursements.filter(r => {
      if (r.transactionId) {
        const transaction = transactions.find(t => t.id === r.transactionId)
        return transaction?.accountBookId === accountBook.id
      }
      return false
    }),
    [reimbursements, transactions, accountBook.id]
  )

  const bookBudgets = useMemo(() =>
    budgets.filter(b => b.accountBookId === accountBook.id),
    [budgets, accountBook.id]
  )

  // 计算统计数据
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const monthExpenses = bookTransactions.filter(t => {
      const date = new Date(t.date)
      return t.type === 'expense' &&
             date.getMonth() === currentMonth &&
             date.getFullYear() === currentYear
    }).reduce((sum, t) => sum + toNumber(t.amount), 0)

    const pendingReimbursement = bookReimbursements
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + toNumber(r.amount), 0)

    // 计算月度预算（如果有）
    const monthlyBudget = bookBudgets
      .filter(b => b.period === 'monthly')
      .reduce((sum, b) => sum + toNumber(b.amount), 0)

    const budgetUsage = monthlyBudget > 0 ? (monthExpenses / monthlyBudget) * 100 : 0

    return {
      balance: toNumber(accountBook.currentBalance),
      monthExpenses,
      pendingReimbursement,
      pendingReimbursementCount: bookReimbursements.filter(r => r.status === 'pending').length,
      monthlyBudget,
      budgetUsage,
    }
  }, [accountBook, bookTransactions, bookReimbursements, bookBudgets])

  return (
    <div className="space-y-6">
      {/* 财务概览 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-indigo-600" />
          财务概览
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">账本余额</p>
            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(stats.balance)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">本月支出</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.monthExpenses)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">预算使用</p>
            {stats.monthlyBudget > 0 ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold">{stats.budgetUsage.toFixed(1)}%</span>
                  <span className="text-sm text-gray-500">
                    {formatCurrency(stats.monthExpenses)} / {formatCurrency(stats.monthlyBudget)}
                  </span>
                </div>
                <Progress
                  value={Math.min(stats.budgetUsage, 100)}
                  className={`h-3 ${stats.budgetUsage > 100 ? '[&>div]:bg-red-500' : stats.budgetUsage > 80 ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
                />
              </>
            ) : (
              <p className="text-sm text-gray-500">未设置预算</p>
            )}
          </div>
        </div>

        {stats.pendingReimbursement > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">待报销</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-orange-600">{formatCurrency(stats.pendingReimbursement)}</p>
                <p className="text-xs text-gray-500">{stats.pendingReimbursementCount} 笔待处理</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 快速操作 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">快速操作</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            className="w-full flex items-center justify-center gap-2"
            onClick={() => handleQuickAction('expense', false)}
          >
            <Plus className="w-4 h-4" />
            记一笔支出
          </Button>
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => handleQuickAction('expense', true)}
          >
            <Receipt className="w-4 h-4" />
            添加报销
          </Button>
        </div>
      </Card>

      {/* Quick Add Dialog */}
      <QuickAddDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={dialogType}
        accountBookId={accountBook.id}
        needsReimbursement={needsReimbursement}
      />

      {/* 最近交易 */}
      {bookTransactions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">最近交易</h3>
          <div className="space-y-3">
            {bookTransactions.slice(0, 10).map(transaction => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-gray-500">{new Date(transaction.date).toLocaleDateString('zh-CN')}</p>
                </div>
                <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(toNumber(transaction.amount))}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 分类支出统计 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          本月分类支出
        </h3>
        <div className="space-y-3">
          {useMemo(() => {
            const categoryExpenses = new Map<string, { name: string; amount: number }>()

            bookTransactions
              .filter(t => {
                const date = new Date(t.date)
                return t.type === 'expense' &&
                       date.getMonth() === new Date().getMonth() &&
                       date.getFullYear() === new Date().getFullYear()
              })
              .forEach(t => {
                const categoryId = t.categoryTagId || 'uncategorized'
                const existing = categoryExpenses.get(categoryId) || { name: '未分类', amount: 0 }
                categoryExpenses.set(categoryId, {
                  ...existing,
                  amount: existing.amount + toNumber(t.amount)
                })
              })

            return Array.from(categoryExpenses.values())
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 5)
              .map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{cat.name}</span>
                  <span className="font-semibold">{formatCurrency(cat.amount)}</span>
                </div>
              ))
          }, [bookTransactions])}
        </div>
      </Card>
    </div>
  )
}
