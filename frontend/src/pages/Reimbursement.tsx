import { useState, useMemo } from 'react'
import { Plus, Check, Trash2, Clock, BarChart3, Calendar, Zap, Copy, Undo2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFinanceStore } from '@/store/useFinanceStore'
import { formatCurrency, formatShortDate } from '@/utils/formatters'
import type { Reimbursement } from '@/store/types'

export default function Reimbursement() {
  const { reimbursements, addReimbursement, updateReimbursement, deleteReimbursement, stats } = useFinanceStore()
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item: '',
    amount: '',
    note: '',
  })

  const pendingReimbs = reimbursements.filter(r => r.status === 'pending')
  const reimbursedReimbs = reimbursements.filter(r => r.status === 'reimbursed')

  // 统计数据
  const statistics = useMemo(() => {
    const totalPending = pendingReimbs.reduce((sum, r) => sum + Number(r.amount), 0)
    const totalReimbursed = reimbursedReimbs.reduce((sum, r) => sum + Number(r.amount), 0)
    const totalAll = totalPending + totalReimbursed
    const avgReimb = reimbursements.length > 0 ? totalAll / reimbursements.length : 0
    const maxReimb = reimbursements.length > 0 ? Math.max(...reimbursements.map(r => Number(r.amount))) : 0

    // 计算平均报销时长
    const avgDays = reimbursedReimbs.length > 0
      ? reimbursedReimbs.reduce((sum, r) => {
          if (r.reimbursedDate) {
            const days = Math.floor(
              (new Date(r.reimbursedDate).getTime() - new Date(r.date).getTime()) /
              (1000 * 60 * 60 * 24)
            )
            return sum + days
          }
          return sum
        }, 0) / reimbursedReimbs.length
      : 0

    // 最近6个月趋势
    const last6Months = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric' })

      const monthReimbs = reimbursedReimbs.filter(r => {
        if (!r.reimbursedDate) return false
        const rDate = new Date(r.reimbursedDate)
        return rDate.getMonth() === date.getMonth() && rDate.getFullYear() === date.getFullYear()
      })

      last6Months.push({
        month: monthStr,
        count: monthReimbs.length,
        amount: monthReimbs.reduce((sum, r) => sum + Number(r.amount), 0)
      })
    }

    return {
      totalPending,
      totalReimbursed,
      totalAll,
      avgReimb,
      maxReimb,
      avgDays,
      last6Months
    }
  }, [reimbursements, pendingReimbs, reimbursedReimbs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addReimbursement({
      date: formData.date,
      item: formData.item,
      amount: parseFloat(formData.amount),
      note: formData.note,
      status: 'pending',
    })
    setFormData({
      date: new Date().toISOString().split('T')[0],
      item: '',
      amount: '',
      note: '',
    })
    setIsOpen(false)
  }

  const handleMarkReimbursed = async (id: string) => {
    await updateReimbursement(id, {
      status: 'reimbursed',
      reimbursedDate: new Date().toISOString().split('T')[0],
    })
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条报销记录吗？')) {
      await deleteReimbursement(id)
    }
  }

  // 撤销报销
  const handleUndoReimbursement = async (id: string) => {
    if (window.confirm('确定要撤销这条报销记录吗？将恢复为待报销状态。')) {
      await updateReimbursement(id, {
        status: 'pending',
        reimbursedDate: undefined,
      })
    }
  }

  // 快速复制报销项
  const handleCopyReimbursement = (reimb: Reimbursement) => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      item: reimb.item,
      amount: reimb.amount.toString(),
      note: reimb.note,
    })
    setIsOpen(true)
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto pb-20 md:pb-6 animate-in fade-in duration-700">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
            报销分析
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            待报销: {formatCurrency(stats?.pendingReimbursement || 0)}
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
              <Plus className="w-4 h-4" />
              添加
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-slate-100">添加报销项</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="date" className="text-slate-700 dark:text-slate-300">支出日期</Label>
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
                <Label htmlFor="item" className="text-slate-700 dark:text-slate-300">报销项目</Label>
                <Input
                  id="item"
                  type="text"
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  placeholder="如：工作支出"
                  required
                  className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div>
                <Label htmlFor="amount" className="text-slate-700 dark:text-slate-300">金额</Label>
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
              <div>
                <Label htmlFor="note" className="text-slate-700 dark:text-slate-300">备注</Label>
                <Input
                  id="note"
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="详细说明"
                  required
                  className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white">
                  添加
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200">
                  取消
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 报销统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-in slide-in-from-bottom duration-700 delay-100">
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 backdrop-blur-sm border-2 border-amber-200 dark:border-amber-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">待报销</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
              {formatCurrency(statistics.totalPending)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {pendingReimbs.length} 笔待收回
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-600/10 to-green-600/10 dark:from-emerald-600/20 dark:to-green-600/20 backdrop-blur-sm border-2 border-emerald-200 dark:border-emerald-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">已报销</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
              {formatCurrency(statistics.totalReimbursed)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {reimbursedReimbs.length} 笔已到账
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-600/10 to-indigo-600/10 dark:from-violet-600/20 dark:to-indigo-600/20 backdrop-blur-sm border-2 border-violet-200 dark:border-violet-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">平均单笔</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
              {formatCurrency(statistics.avgReimb)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              最大 {formatCurrency(statistics.maxReimb)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 backdrop-blur-sm border-2 border-cyan-200 dark:border-cyan-700 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">平均时长</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              {Math.round(statistics.avgDays)}天
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              报销周期
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 报销分析 */}
      <Card className="border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/50 dark:to-purple-950/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom duration-700 delay-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            报销分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg border border-indigo-100 dark:border-indigo-800">
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">平均单笔</div>
              <div className="text-xl md:text-2xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                {formatCurrency(statistics.avgReimb)}
              </div>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-100 dark:border-purple-800">
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">最大单笔</div>
              <div className="text-xl md:text-2xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                {formatCurrency(statistics.maxReimb)}
              </div>
            </div>
          </div>
          {statistics.avgDays > 0 && (
            <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">平均报销时长</span>
                <span className="font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {Math.round(statistics.avgDays)} 天
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 月度报销趋势 */}
      {statistics.last6Months.some(m => m.count > 0) && (
        <Card className="border-2 border-cyan-200 dark:border-cyan-700 bg-gradient-to-br from-cyan-50/80 to-blue-50/80 dark:from-cyan-950/50 dark:to-blue-950/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom duration-700 delay-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              月度趋势（最近6个月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statistics.last6Months.filter(m => m.count > 0).map((month, index) => {
                const maxAmount = Math.max(...statistics.last6Months.map(m => m.amount))
                const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 w-16">
                      {month.month.replace(/\//g, '/')}
                    </div>
                    <div className="flex-1">
                      <div className="h-6 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 transition-all duration-500 shadow-md"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300 w-24 text-right">
                      {formatCurrency(month.amount)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 w-12 text-right">
                      {month.count}笔
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 快速报销 */}
      {reimbursedReimbs.length > 0 && (
        <Card className="border-2 border-emerald-200 dark:border-emerald-700 bg-gradient-to-br from-emerald-50/80 to-green-50/80 dark:from-emerald-950/50 dark:to-green-950/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom duration-700 delay-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              快速报销
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">点击"再报一次"快速复制报销项</div>
              {reimbursedReimbs.slice(0, 3).map((reimb) => (
                <div
                  key={reimb.id}
                  className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg border border-emerald-100 dark:border-emerald-800 hover:bg-white/90 dark:hover:bg-slate-800/90 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {reimb.item}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {reimb.note} · {formatCurrency(reimb.amount)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyReimbursement(reimb)}
                    className="flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 dark:from-emerald-500 dark:to-green-500 dark:hover:from-emerald-600 dark:hover:to-green-600 text-white border-0 shadow-md hover:shadow-lg ml-2 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Copy className="w-3 h-3" />
                    再报一次
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 报销列表 */}
      <Tabs defaultValue="pending" className="w-full animate-in slide-in-from-bottom duration-700 delay-500">
        <TabsList className="grid w-full grid-cols-2 dark:bg-slate-800 dark:border-slate-700">
          <TabsTrigger value="pending" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-700">
            待报销 ({pendingReimbs.length})
          </TabsTrigger>
          <TabsTrigger value="reimbursed" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-700">
            已报销 ({reimbursedReimbs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2 mt-4">
          {pendingReimbs.length === 0 ? (
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6 text-center text-slate-500 dark:text-slate-400">
                暂无待报销项目
              </CardContent>
            </Card>
          ) : (
            pendingReimbs
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((reimb, index) => (
                <Card
                  key={reimb.id}
                  className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-2 border-amber-200 dark:border-amber-700 hover:border-amber-300 dark:hover:border-amber-600 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{reimb.item}</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{reimb.note}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {formatShortDate(reimb.date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-lg md:text-xl bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                            {formatCurrency(reimb.amount)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleMarkReimbursed(reimb.id)}
                          className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 dark:from-emerald-500 dark:to-green-500 dark:hover:from-emerald-600 dark:hover:to-green-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(reimb.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="reimbursed" className="space-y-2 mt-4">
          {reimbursedReimbs.length === 0 ? (
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6 text-center text-slate-500 dark:text-slate-400">
                暂无已报销记录
              </CardContent>
            </Card>
          ) : (
            reimbursedReimbs
              .sort((a, b) => {
                const dateA = a.reimbursedDate ? new Date(a.reimbursedDate).getTime() : 0
                const dateB = b.reimbursedDate ? new Date(b.reimbursedDate).getTime() : 0
                return dateB - dateA
              })
              .map((reimb, index) => (
                <Card
                  key={reimb.id}
                  className="backdrop-blur-sm bg-gradient-to-br from-emerald-50/80 to-green-50/80 dark:from-emerald-950/50 dark:to-green-950/50 border-2 border-emerald-200 dark:border-emerald-700 hover:border-emerald-300 dark:hover:border-emerald-600 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-green-600 dark:from-emerald-500 dark:to-green-500 shadow-md">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          {reimb.item}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{reimb.note}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          支出: {formatShortDate(reimb.date)} ·
                          报销: {reimb.reimbursedDate ? formatShortDate(reimb.reimbursedDate) : '-'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-bold text-lg md:text-xl bg-gradient-to-br from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
                            {formatCurrency(reimb.amount)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUndoReimbursement(reimb.id)}
                          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 dark:from-amber-500 dark:to-orange-500 dark:hover:from-amber-600 dark:hover:to-orange-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                          title="撤销报销"
                        >
                          <Undo2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(reimb.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-300"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
