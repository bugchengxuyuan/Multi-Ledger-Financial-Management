import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QuickAddDialog } from '@/components/QuickAddDialog'
import { useFinanceStore } from '@/store/useFinanceStore'
import { toNumber, formatCurrency } from '@/utils/formatters'
import { Plus, Receipt, TrendingUp as TrendingUpIcon, Wallet } from 'lucide-react'
import type { AccountBook, TransactionType } from '@/store/types'

interface PersonalBookViewProps {
  accountBook: AccountBook
}

export function PersonalBookView({ accountBook }: PersonalBookViewProps) {
  const { transactions, reimbursements, investments } = useFinanceStore()

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

  const bookInvestments = useMemo(() =>
    investments.filter(i => i.accountBookId === accountBook.id),
    [investments, accountBook.id]
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

    const totalInvestment = bookInvestments
      .filter(i => i.status === 'holding')
      .reduce((sum, i) => sum + toNumber(i.amount), 0)

    return {
      balance: toNumber(accountBook.currentBalance),
      monthExpenses,
      pendingReimbursement,
      pendingReimbursementCount: bookReimbursements.filter(r => r.status === 'pending').length,
      totalInvestment,
    }
  }, [accountBook, bookTransactions, bookReimbursements, bookInvestments])

  return (
    <div className="space-y-6">
      {/* 财务概览 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-violet-600" />
          财务概览
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">账本余额</p>
            <p className="text-2xl font-bold text-violet-600">{formatCurrency(stats.balance)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">本月支出</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.monthExpenses)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">待报销</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.pendingReimbursement)}
            </p>
            {stats.pendingReimbursementCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">{stats.pendingReimbursementCount} 笔待处理</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">投资资产</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalInvestment)}</p>
          </div>
        </div>
      </Card>

      {/* 快速操作 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">快速操作</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => handleQuickAction('investment', false)}
          >
            <TrendingUpIcon className="w-4 h-4" />
            记录投资
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
    </div>
  )
}
