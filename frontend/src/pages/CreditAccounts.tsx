import { useState, useMemo } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { CreditAccount } from '@/store/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, CreditCard, Trash2, Edit, DollarSign } from 'lucide-react'
import { formatCurrency, toNumber } from '@/utils/formatters'

export default function CreditAccounts() {
  const { creditAccounts, accountBooks, addCreditAccount, updateCreditAccount, deleteCreditAccount, recordRepayment } = useFinanceStore()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isRepaymentDialogOpen, setIsRepaymentDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<CreditAccount | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    type: 'credit_card',
    currentDebt: 0,
    creditLimit: 0,
    repaymentDay: 1,
    monthlyRepayment: 0,
    status: 'active',
    accountBookId: '',
    note: '',
  })

  const [repaymentAmount, setRepaymentAmount] = useState(0)
  const [repaymentNote, setRepaymentNote] = useState('')

  // 过滤账户
  const filteredAccounts = useMemo(() => {
    if (filterStatus === 'all') return creditAccounts
    return creditAccounts.filter(acc => acc.status === filterStatus)
  }, [creditAccounts, filterStatus])

  // 处理添加账户
  const handleAdd = async () => {
    try {
      const defaultBook = accountBooks.find(book => book.isDefault)
      await addCreditAccount({
        ...formData,
        accountBookId: formData.accountBookId || defaultBook?.id || '',
      })
      setIsAddDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Failed to add credit account:', error)
    }
  }

  // 处理更新账户
  const handleUpdate = async () => {
    if (!selectedAccount) return
    try {
      await updateCreditAccount(selectedAccount.id, formData)
      setIsEditDialogOpen(false)
      setSelectedAccount(null)
      resetForm()
    } catch (error) {
      console.error('Failed to update credit account:', error)
    }
  }

  // 处理删除账户
  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个信用账户吗？')) {
      try {
        await deleteCreditAccount(id)
      } catch (error) {
        console.error('Failed to delete credit account:', error)
      }
    }
  }

  // 处理还款
  const handleRepayment = async () => {
    if (!selectedAccount || repaymentAmount <= 0) return
    try {
      await recordRepayment(selectedAccount.id, repaymentAmount, repaymentNote)
      setIsRepaymentDialogOpen(false)
      setSelectedAccount(null)
      setRepaymentAmount(0)
      setRepaymentNote('')
    } catch (error) {
      console.error('Failed to record repayment:', error)
    }
  }

  // 打开编辑对话框
  const openEditDialog = (account: CreditAccount) => {
    setSelectedAccount(account)
    setFormData({
      name: account.name,
      provider: account.provider,
      type: account.type,
      currentDebt: toNumber(account.currentDebt),
      creditLimit: toNumber(account.creditLimit),
      repaymentDay: account.repaymentDay,
      monthlyRepayment: toNumber(account.monthlyRepayment),
      status: account.status,
      accountBookId: account.accountBookId,
      note: account.note || '',
    })
    setIsEditDialogOpen(true)
  }

  // 打开还款对话框
  const openRepaymentDialog = (account: CreditAccount) => {
    setSelectedAccount(account)
    setRepaymentAmount(0)
    setRepaymentNote('')
    setIsRepaymentDialogOpen(true)
  }

  // 重置表单
  const resetForm = () => {
    const defaultBook = accountBooks.find(book => book.isDefault)
    setFormData({
      name: '',
      provider: '',
      type: 'credit_card',
      currentDebt: 0,
      creditLimit: 0,
      repaymentDay: 1,
      monthlyRepayment: 0,
      status: 'active',
      accountBookId: defaultBook?.id || '',
      note: '',
    })
  }

  // 计算统计
  const stats = useMemo(() => {
    const totalDebt = creditAccounts
      .filter(acc => acc.status === 'active')
      .reduce((sum, acc) => sum + toNumber(acc.currentDebt), 0)

    const totalLimit = creditAccounts
      .filter(acc => acc.status === 'active')
      .reduce((sum, acc) => sum + toNumber(acc.creditLimit), 0)

    return { totalDebt, totalLimit, available: totalLimit - totalDebt }
  }, [creditAccounts])

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
          信用账户管理
        </h1>
        <Button
          onClick={() => {
            resetForm()
            setIsAddDialogOpen(true)
          }}
          className="bg-gradient-to-r from-violet-600 to-indigo-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加账户
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">总欠款</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalDebt)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">总额度</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalLimit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">可用额度</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.available)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 过滤器 */}
      <div className="mb-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部账户</SelectItem>
            <SelectItem value="active">活动</SelectItem>
            <SelectItem value="settled">已结清</SelectItem>
            <SelectItem value="suspended">暂停</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 账户列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map(account => (
          <Card key={account.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {account.name}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  account.status === 'active' ? 'bg-green-100 text-green-700' :
                  account.status === 'settled' ? 'bg-gray-100 text-gray-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {account.status === 'active' ? '活动' : account.status === 'settled' ? '已结清' : '暂停'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">当前欠款</div>
                  <div className="text-xl font-bold text-red-600">
                    {formatCurrency(toNumber(account.currentDebt))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">信用额度</div>
                  <div className="text-lg">
                    {account.creditLimit ? formatCurrency(toNumber(account.creditLimit)) : '无限制'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">还款日</div>
                  <div className="text-lg">每月 {account.repaymentDay} 号</div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openRepaymentDialog(account)}
                    disabled={account.status !== 'active' || toNumber(account.currentDebt) === 0}
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    还款
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(account)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          暂无信用账户
        </div>
      )}

      {/* 添加对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加信用账户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>账户名称*</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 支付宝-花呗"
                />
              </div>
              <div>
                <Label>提供商*</Label>
                <Input
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  placeholder="例如: 支付宝"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>当前欠款</Label>
                <Input
                  type="number"
                  value={formData.currentDebt}
                  onChange={(e) => setFormData({ ...formData, currentDebt: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>信用额度</Label>
                <Input
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>还款日*</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.repaymentDay}
                  onChange={(e) => setFormData({ ...formData, repaymentDay: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>固定月还款额</Label>
                <Input
                  type="number"
                  value={formData.monthlyRepayment}
                  onChange={(e) => setFormData({ ...formData, monthlyRepayment: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>账本</Label>
              <Select value={formData.accountBookId} onValueChange={(value) => setFormData({ ...formData, accountBookId: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountBooks.map(book => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>备注</Label>
              <Input
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="备注信息"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAdd}>
                添加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑信用账户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 和添加对话框相同的表单字段 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>账户名称*</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>提供商*</Label>
                <Input
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>当前欠款</Label>
                <Input
                  type="number"
                  value={formData.currentDebt}
                  onChange={(e) => setFormData({ ...formData, currentDebt: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>信用额度</Label>
                <Input
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>还款日*</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.repaymentDay}
                  onChange={(e) => setFormData({ ...formData, repaymentDay: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>固定月还款额</Label>
                <Input
                  type="number"
                  value={formData.monthlyRepayment}
                  onChange={(e) => setFormData({ ...formData, monthlyRepayment: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>状态</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">活动</SelectItem>
                  <SelectItem value="settled">已结清</SelectItem>
                  <SelectItem value="suspended">暂停</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>备注</Label>
              <Input
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdate}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 还款对话框 */}
      <Dialog open={isRepaymentDialogOpen} onOpenChange={setIsRepaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>记录还款 - {selectedAccount?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                当前欠款: {selectedAccount && formatCurrency(toNumber(selectedAccount.currentDebt))}
              </div>
              <Label>还款金额*</Label>
              <Input
                type="number"
                value={repaymentAmount}
                onChange={(e) => setRepaymentAmount(Number(e.target.value))}
                placeholder="输入还款金额"
              />
            </div>
            <div>
              <Label>备注</Label>
              <Input
                value={repaymentNote}
                onChange={(e) => setRepaymentNote(e.target.value)}
                placeholder="还款备注"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRepaymentDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleRepayment} disabled={repaymentAmount <= 0}>
                确认还款
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
