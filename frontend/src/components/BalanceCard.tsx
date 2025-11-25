import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { balanceApi, type BalanceStats } from '@/api/balance'
import { useFinanceStore } from '@/store/useFinanceStore'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { toNumber } from '@/utils/formatters'

interface BalanceCardProps {
  accountBookId: string | null // null表示全部账本
}

export function BalanceCard({ accountBookId }: BalanceCardProps) {
  const accountBooks = useFinanceStore(state => state.accountBooks)
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [totalBalance, setTotalBalance] = useState<number>(0)

  useEffect(() => {
    const loadBalanceData = async () => {
      setIsLoading(true)
      try {
        if (accountBookId) {
          // 单个账本模式：获取该账本的统计数据
          const stats = await balanceApi.getBalanceStats(accountBookId)
          setBalanceStats(stats)
          setTotalBalance(toNumber(stats.currentBalance))
        } else {
          // 全部账本模式：汇总所有账本的余额
          const total = accountBooks.reduce((sum, book) => {
            return sum + toNumber(book.currentBalance)
          }, 0)
          setTotalBalance(total)
          setBalanceStats(null)
        }
      } catch (error) {
        console.error('Failed to load balance data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadBalanceData()
  }, [accountBookId, accountBooks])

  // 计算余额变化趋势
  const calculateTrend = () => {
    if (!balanceStats) return null

    const current = toNumber(balanceStats.currentBalance)
    const initial = toNumber(balanceStats.initialBalance)

    if (initial === 0) return null

    const change = current - initial
    const changePercent = (change / initial) * 100

    return {
      change,
      changePercent,
      isPositive: change > 0,
      isNegative: change < 0,
    }
  }

  const trend = calculateTrend()

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-32"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          {accountBookId ? '当前余额' : '总余额'}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold">
            ¥{totalBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {trend && (
          <div className="flex items-center gap-1 text-sm">
            {trend.isPositive && (
              <>
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-green-600">
                  +¥{Math.abs(trend.change).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {' '}({trend.changePercent.toFixed(1)}%)
                </span>
              </>
            )}
            {trend.isNegative && (
              <>
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-red-600">
                  -¥{Math.abs(trend.change).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {' '}({Math.abs(trend.changePercent).toFixed(1)}%)
                </span>
              </>
            )}
            {!trend.isPositive && !trend.isNegative && (
              <>
                <Minus className="w-4 h-4 text-gray-600" />
                <span className="text-gray-600">无变化</span>
              </>
            )}
            <span className="text-gray-500 ml-1">相比初始余额</span>
          </div>
        )}

        {!accountBookId && accountBooks.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            汇总 {accountBooks.length} 个账本
          </p>
        )}
      </div>
    </Card>
  )
}
