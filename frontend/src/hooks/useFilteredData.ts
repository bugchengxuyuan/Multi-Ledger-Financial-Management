import { useMemo } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'

/**
 * Hook for filtering data based on current account book
 * Returns filtered expenses based on the current account book selection
 */
export function useFilteredData() {
  const { expenses, config } = useFinanceStore()

  const filteredExpenses = useMemo(() => {
    const currentBookId = config?.currentAccountBookId

    // If no account book is selected, return all expenses
    if (!currentBookId) {
      return expenses
    }

    // Filter expenses by account book
    return expenses.filter(expense => expense.accountBookId === currentBookId)
  }, [expenses, config?.currentAccountBookId])

  return {
    filteredExpenses,
    currentAccountBookId: config?.currentAccountBookId || null
  }
}
