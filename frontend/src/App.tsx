import { useEffect, useState } from 'react'
import { Home, Receipt, BookOpen, Tag, Moon, Sun } from 'lucide-react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { useTheme } from '@/contexts/ThemeContext'
import Dashboard from '@/pages/DashboardNew'
import Transactions from '@/pages/Transactions'
import AccountBooks from '@/pages/AccountBooks'
import Tags from '@/pages/Tags'

type PageId = 'dashboard' | 'transactions' | 'accountBooks' | 'tags'

function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard')
  const { loadData, isLoading, accountBooks, config, setCurrentAccountBook } = useFinanceStore()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    loadData()
  }, [loadData])

  const pages = {
    dashboard: Dashboard,
    transactions: Transactions,
    accountBooks: AccountBooks,
    tags: Tags,
  }

  const CurrentPageComponent = pages[currentPage]

  const navItems = [
    { id: 'dashboard' as PageId, icon: Home, label: '首页' },
    { id: 'transactions' as PageId, icon: Receipt, label: '交易' },
    { id: 'accountBooks' as PageId, icon: BookOpen, label: '账本' },
    { id: 'tags' as PageId, icon: Tag, label: '标签' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-transparent bg-gradient-to-r from-violet-600 to-indigo-600 mx-auto mb-4" style={{ borderTopColor: 'transparent' }}></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* 桌面端侧边导航栏 */}
      <nav className="hidden md:flex md:flex-col md:w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            多账本财务管理
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Multi-Book Finance</p>

          {/* 账本选择器 */}
          {accountBooks.length > 0 && (
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-2">
                <BookOpen className="w-3 h-3" />
                当前账本
              </label>
              <select
                value={config?.currentAccountBookId || ''}
                onChange={(e) => setCurrentAccountBook(e.target.value || null)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 transition-all"
                style={
                  config?.currentAccountBookId && accountBooks.find(b => b.id === config.currentAccountBookId)
                    ? { borderLeftWidth: '3px', borderLeftColor: accountBooks.find(b => b.id === config.currentAccountBookId)!.color }
                    : undefined
                }
              >
                <option value="">全部账本</option>
                {accountBooks.map(book => (
                  <option key={book.id} value={book.id}>
                    {book.icon} {book.name}
                    {book.isDefault && ' (默认)'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-200 ${
                  isActive
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/50 dark:to-indigo-950/50 border-r-4 border-violet-600'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-violet-600' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* 主题切换按钮 */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-5 h-5" />
                <span className="font-medium">浅色模式</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5" />
                <span className="font-medium">深色模式</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <CurrentPageComponent />
      </main>

      {/* 移动端底部导航栏 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                  isActive
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            )
          })}
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center justify-center flex-1 h-full text-slate-500 dark:text-slate-400"
          >
            {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            <span className="text-xs mt-1 font-medium">主题</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default App
