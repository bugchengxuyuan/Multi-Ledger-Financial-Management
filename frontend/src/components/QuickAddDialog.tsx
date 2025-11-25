import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Plus, X } from 'lucide-react'
import type { TransactionType } from '@/store/types'

interface QuickAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType: TransactionType
  accountBookId?: string
  needsReimbursement?: boolean
}

export function QuickAddDialog({
  open,
  onOpenChange,
  defaultType,
  accountBookId,
  needsReimbursement = false,
}: QuickAddDialogProps) {
  const { getCategoryTagsForAccountBook, addTransaction, tags } = useFinanceStore()

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    categoryTagId: '',
    subType: 'fixed_income' as const, // For investment type
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Filter tags based on account book - show global tags + current account book's tags
  const categoryTags = useMemo(() => {
    return getCategoryTagsForAccountBook(accountBookId || null)
  }, [accountBookId, getCategoryTagsForAccountBook])

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        categoryTagId: '',
        subType: 'fixed_income',
      })
      setError('')
    }
    onOpenChange(newOpen)
  }

  // Form validation
  const validateForm = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('请输入有效的金额')
      return false
    }
    if (!formData.description.trim()) {
      setError('请输入描述')
      return false
    }
    if (!formData.categoryTagId && defaultType !== 'investment') {
      setError('请选择分类')
      return false
    }
    return true
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const transactionData: any = {
        type: defaultType,
        date: new Date(formData.date).toISOString(),
        amount: parseFloat(formData.amount),
        description: formData.description,
        accountBookId: accountBookId || undefined,
        categoryTagId: formData.categoryTagId || '',
      }

      // Add type-specific fields
      if (defaultType === 'expense' && needsReimbursement) {
        transactionData.needsReimbursement = true
      }

      if (defaultType === 'investment') {
        transactionData.subType = formData.subType
        transactionData.metadata = {
          name: formData.description,
          status: 'holding',
          purchaseDate: new Date(formData.date).toISOString(),
        }
      }

      await addTransaction(transactionData)

      // Success - close dialog
      handleOpenChange(false)
    } catch (err) {
      console.error('Failed to add transaction:', err)
      setError('添加失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get dialog title based on type
  const getTitle = () => {
    if (needsReimbursement) return '添加报销支出'
    switch (defaultType) {
      case 'expense':
        return '记一笔支出'
      case 'income':
        return '记一笔收入'
      case 'investment':
        return '记录投资'
      default:
        return '添加交易'
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-violet-600" />
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">日期</label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">金额 (¥)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">描述</label>
            <Input
              type="text"
              placeholder={defaultType === 'investment' ? '投资名称' : '例如：午餐'}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full"
            />
          </div>

          {/* Category (not for investment) */}
          {defaultType !== 'investment' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">分类</label>
              <Select
                value={formData.categoryTagId}
                onValueChange={(value) => setFormData({ ...formData, categoryTagId: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categoryTags.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">暂无分类标签</div>
                  ) : (
                    categoryTags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <span className="flex items-center gap-2">
                          {tag.icon && <span>{tag.icon}</span>}
                          {tag.name}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Investment Type */}
          {defaultType === 'investment' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">投资类型</label>
              <Select
                value={formData.subType}
                onValueChange={(value: any) => setFormData({ ...formData, subType: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="precious_metal">贵金属</SelectItem>
                  <SelectItem value="equity">股权投资</SelectItem>
                  <SelectItem value="fixed_income">固收理财</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
              <X className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Footer buttons */}
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
