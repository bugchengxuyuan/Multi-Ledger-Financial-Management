import { useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Tag as TagIcon, Search, Folder, Hash } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Tag, TagType } from '@/store/types'

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

export default function Tags() {
  const {
    tags,
    accountBooks,
    addTag,
    updateTag,
    deleteTag,
    transactions,
  } = useFinanceStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'category' | 'label'>('category')
  const [form, setForm] = useState({
    name: '',
    color: '#3b82f6',
    type: 'category' as TagType,
    accountBookId: null as string | null,
  })

  const resetForm = () => {
    setForm({ name: '', color: '#3b82f6', type: activeTab, accountBookId: null })
    setEditingTag(null)
  }

  const handleOpenDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag)
      setForm({
        name: tag.name,
        color: tag.color,
        type: tag.type,
        accountBookId: tag.accountBookId || null,
      })
    } else {
      setForm({ name: '', color: '#3b82f6', type: activeTab, accountBookId: null })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return

    try {
      if (editingTag) {
        await updateTag(editingTag.id, {
          name: form.name,
          color: form.color,
          type: form.type,
          accountBookId: form.accountBookId || undefined,
        })
      } else {
        await addTag({
          name: form.name,
          color: form.color,
          type: form.type,
          accountBookId: form.accountBookId || undefined,
          count: 0,
        })
      }
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const handleDelete = async (tag: Tag) => {
    const confirmMessage = tag.type === 'category'
      ? '确定要删除这个分类标签吗？如果有交易使用此分类将无法删除。'
      : '确定要删除这个标签吗？将从所有交易中移除。'

    if (window.confirm(confirmMessage)) {
      try {
        await deleteTag(tag.id)
      } catch (error) {
        alert((error as Error).message)
      }
    }
  }

  // 过滤和分组标签
  const filteredTags = useMemo(() => {
    return tags.filter(tag =>
      tag.type === activeTab &&
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [tags, activeTab, searchQuery])

  // 按账本分组
  const groupedTags = useMemo(() => {
    const global = filteredTags.filter(t => !t.accountBookId)
    const byBook: Record<string, Tag[]> = {}

    filteredTags.forEach(tag => {
      if (tag.accountBookId) {
        if (!byBook[tag.accountBookId]) {
          byBook[tag.accountBookId] = []
        }
        byBook[tag.accountBookId].push(tag)
      }
    })

    return { global, byBook }
  }, [filteredTags])

  // 计算标签使用次数
  const getTagUsageCount = (tagId: string) => {
    return transactions.filter(t =>
      t.categoryTagId === tagId || t.labelTagIds?.includes(tagId)
    ).length
  }

  const renderTagCard = (tag: Tag) => {
    const usageCount = getTagUsageCount(tag.id)
    return (
      <div
        key={tag.id}
        className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-shadow"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          <span className="font-medium text-slate-900 dark:text-slate-100">{tag.name}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {usageCount} 次使用
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(tag)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(tag)}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">标签管理</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">管理分类和普通标签</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              新建标签
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTag ? '编辑标签' : '新建标签'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>标签名称 *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="如：餐饮、交通、购物"
                />
              </div>
              <div className="space-y-2">
                <Label>标签类型</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={form.type === 'category' ? 'default' : 'outline'}
                    onClick={() => setForm({ ...form, type: 'category' })}
                    className="flex-1"
                  >
                    <Folder className="w-4 h-4 mr-2" />
                    分类标签
                  </Button>
                  <Button
                    type="button"
                    variant={form.type === 'label' ? 'default' : 'outline'}
                    onClick={() => setForm({ ...form, type: 'label' })}
                    className="flex-1"
                  >
                    <Hash className="w-4 h-4 mr-2" />
                    普通标签
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {form.type === 'category'
                    ? '分类标签：每笔交易必选一个，用于主要分类'
                    : '普通标签：可选多个，用于灵活标记'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>所属账本</Label>
                <select
                  value={form.accountBookId || ''}
                  onChange={e => setForm({ ...form, accountBookId: e.target.value || null })}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="">全局标签（所有账本可用）</option>
                  {accountBooks.map(book => (
                    <option key={book.id} value={book.id}>
                      {book.icon} {book.name}
                    </option>
                  ))}
                </select>
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
                {editingTag ? '保存修改' : '创建标签'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索标签..."
          className="pl-10"
        />
      </div>

      {/* 标签类型切换 */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'category' | 'label')} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="category" className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            分类标签
          </TabsTrigger>
          <TabsTrigger value="label" className="flex items-center gap-2">
            <Hash className="w-4 h-4" />
            普通标签
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 标签列表 */}
      {filteredTags.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <TagIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {searchQuery ? '没有找到匹配的标签' : `还没有${activeTab === 'category' ? '分类' : '普通'}标签`}
            </p>
            {!searchQuery && (
              <Button onClick={() => handleOpenDialog()} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                创建标签
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 全局标签 */}
          {groupedTags.global.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  全局标签（所有账本可用）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTags.global.map(renderTagCard)}
              </CardContent>
            </Card>
          )}

          {/* 按账本分组的标签 */}
          {Object.entries(groupedTags.byBook).map(([bookId, bookTags]) => {
            const book = accountBooks.find(b => b.id === bookId)
            if (!book) return null
            return (
              <Card key={bookId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>{book.icon}</span>
                    {book.name} 专属标签
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bookTags.map(renderTagCard)}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
