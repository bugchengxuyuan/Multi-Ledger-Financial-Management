import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { balanceApi } from '@/api/balance'
import { incomesApi } from '@/api/incomes'
import { accountBooksApi } from '@/api/accountBooks'
import type { AccountBook, BalanceLog } from '@/store/types'

export default function Balance() {
  const [accountBooks, setAccountBooks] = useState<AccountBook[]>([])
  const [selectedBook, setSelectedBook] = useState<AccountBook | null>(null)
  const [balanceLogs, setBalanceLogs] = useState<BalanceLog[]>([])
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [newBalance, setNewBalance] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    loadAccountBooks()
  }, [])

  const loadAccountBooks = async () => {
    try {
      const books = await accountBooksApi.getAll()
      setAccountBooks(books)
      if (books.length > 0) {
        selectBook(books[0])
      }
    } catch (error) {
      console.error('Failed to load account books:', error)
    }
  }

  const selectBook = async (book: AccountBook) => {
    setSelectedBook(book)
    try {
      const result = await balanceApi.getBalance(book.id)
      setBalanceLogs(result.recentLogs || [])
    } catch (error) {
      console.error('Failed to load balance:', error)
    }
  }

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBook) return

    try {
      await balanceApi.adjustBalance(selectedBook.id, parseFloat(newBalance), note)
      setIsAdjustOpen(false)
      setNewBalance('')
      setNote('')
      loadAccountBooks()
      selectBook(selectedBook)
    } catch (error) {
      console.error('Failed to adjust balance:', error)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount)
  }

  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      income: '收入',
      expense: '支出',
      manual_adjust: '手动调整',
      initial: '初始化',
    }
    return labels[type] || type
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto pb-20 md:pb-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
          余额管理
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          管理各账本余额和查看变动历史
        </p>
      </div>

      {/* 账本切换 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {accountBooks.map((book) => (
          <Button
            key={book.id}
            variant={selectedBook?.id === book.id ? 'default' : 'outline'}
            onClick={() => selectBook(book)}
            className="whitespace-nowrap"
          >
            {book.icon} {book.name}
          </Button>
        ))}
      </div>

      {selectedBook && (
        <>
          {/* 余额卡片 */}
          <Card className="border-2 border-green-200 dark:border-green-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedBook.icon} {selectedBook.name}</span>
                <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      调整余额
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>调整余额</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdjustBalance} className="space-y-4">
                      <div>
                        <Label htmlFor="newBalance">新余额</Label>
                        <Input
                          id="newBalance"
                          type="number"
                          step="0.01"
                          value={newBalance}
                          onChange={(e) => setNewBalance(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="note">备注（可选）</Label>
                        <Input
                          id="note"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="调整原因"
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        确认调整
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">当前余额</div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatAmount(Number(selectedBook.currentBalance))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">初始余额</div>
                  <div className="text-xl font-semibold text-slate-700 dark:text-slate-300">
                    {formatAmount(Number(selectedBook.initialBalance))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 余额变动历史 */}
          <Card>
            <CardHeader>
              <CardTitle>最近变动</CardTitle>
            </CardHeader>
            <CardContent>
              {balanceLogs.length === 0 ? (
                <div className="text-center text-slate-500 py-8">暂无变动记录</div>
              ) : (
                <div className="space-y-2">
                  {balanceLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {getChangeTypeLabel(log.changeType)}
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              log.changeAmount >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {log.changeAmount >= 0 ? '+' : ''}
                            {formatAmount(Number(log.changeAmount))}
                          </span>
                        </div>
                        {log.note && (
                          <div className="text-xs text-slate-500 mt-1">{log.note}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatAmount(Number(log.amountAfter))}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(log.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
