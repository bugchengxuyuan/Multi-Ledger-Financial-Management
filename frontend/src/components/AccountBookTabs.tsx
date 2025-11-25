import { useFinanceStore } from '@/store/useFinanceStore'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toNumber } from '@/utils/formatters'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface AccountBookTabsProps {
  value: string
  onValueChange: (value: string) => void
}

export function AccountBookTabs({ value, onValueChange }: AccountBookTabsProps) {
  const accountBooks = useFinanceStore(state => state.accountBooks)

  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList className="w-full h-auto p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
          {accountBooks.map(book => {
            const balance = toNumber(book.currentBalance)
            const initialBalance = toNumber(book.initialBalance)
            const change = balance - initialBalance
            const isPositive = change > 0
            const changePercent = initialBalance !== 0 ? (change / initialBalance) * 100 : 0

            return (
              <TabsTrigger
                key={book.id}
                value={book.id}
                className="flex flex-col items-start p-3 h-auto data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-50 data-[state=active]:to-indigo-50 dark:data-[state=active]:from-violet-900/20 dark:data-[state=active]:to-indigo-900/20 data-[state=active]:border-2 data-[state=active]:border-violet-500"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{book.icon}</span>
                  <span className="font-semibold text-sm">{book.name}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">
                    ¥{balance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {changePercent !== 0 && (
                    <span className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
                    </span>
                  )}
                </div>
              </TabsTrigger>
            )
          })}

          <TabsTrigger
            value="overview"
            className="flex flex-col items-start p-3 h-auto data-[state=active]:bg-gradient-to-br data-[state=active]:from-slate-50 data-[state=active]:to-slate-100 dark:data-[state=active]:from-slate-800 dark:data-[state=active]:to-slate-900 data-[state=active]:border-2 data-[state=active]:border-slate-500"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📊</span>
              <span className="font-semibold text-sm">总览</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">
                ¥{accountBooks.reduce((sum, book) => sum + toNumber(book.currentBalance), 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-500">总资产</span>
            </div>
          </TabsTrigger>
        </div>
      </TabsList>
    </Tabs>
  )
}
