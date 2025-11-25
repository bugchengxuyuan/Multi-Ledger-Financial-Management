import { useFinanceStore } from '@/store/useFinanceStore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AccountBookSelectorProps {
  className?: string
}

export function AccountBookSelector({ className }: AccountBookSelectorProps) {
  const accountBooks = useFinanceStore(state => state.accountBooks)
  const selectedAccountBookId = useFinanceStore(state => state.selectedAccountBookId)
  const setSelectedAccountBook = useFinanceStore(state => state.setSelectedAccountBook)

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      setSelectedAccountBook(null)
    } else {
      setSelectedAccountBook(value)
    }
  }

  const currentValue = selectedAccountBookId || 'all'

  return (
    <Select value={currentValue} onValueChange={handleValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="选择账本" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部账本</SelectItem>
        {accountBooks.map(book => (
          <SelectItem key={book.id} value={book.id}>
            {book.icon} {book.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
