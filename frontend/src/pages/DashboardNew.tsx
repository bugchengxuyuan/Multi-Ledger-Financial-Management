import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { AccountBookTabs } from '@/components/AccountBookTabs'
import { PersonalBookView } from '@/components/dashboard/PersonalBookView'
import { TikTokBookView } from '@/components/dashboard/TikTokBookView'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'

export default function DashboardNew() {
  const accountBooks = useFinanceStore(state => state.accountBooks)
  const [selectedTab, setSelectedTab] = useState<string>('overview')

  // 确保在 accountBooks 加载后设置初始 tab
  useEffect(() => {
    if (accountBooks.length > 0 && selectedTab === 'overview') {
      const initialTab = accountBooks[0].id
      setSelectedTab(initialTab)
    }
  }, [accountBooks, selectedTab])

  // 增强的 setSelectedTab 处理函数
  const handleTabChange = (newTab: string) => {
    setSelectedTab(newTab)
  }

  const [showExportMenu, setShowExportMenu] = useState(false)

  const currentBook = accountBooks.find(b => b.id === selectedTab)

  // 判断账本类型
  const isPersonalBook = currentBook?.name.includes('个人')
  const isTikTokBook = currentBook?.name.toLowerCase().includes('tiktok')

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
            财务仪表盘
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>
        <div className="relative">
          <Button
            onClick={() => setShowExportMenu(!showExportMenu)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">导出数据</span>
          </Button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 backdrop-blur-lg border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl z-10 overflow-hidden">
              <button className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm">
                导出为 CSV
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm">
                导出为 Excel
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm">
                导出为 PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 账本标签页 */}
      <AccountBookTabs value={selectedTab} onValueChange={handleTabChange} />

      {/* 账本内容 */}
      {currentBook && (
        <div className="animate-in fade-in duration-300">
          {isPersonalBook && <PersonalBookView accountBook={currentBook} />}
          {isTikTokBook && <TikTokBookView accountBook={currentBook} />}
          {!isPersonalBook && !isTikTokBook && <PersonalBookView accountBook={currentBook} />}
        </div>
      )}

      {/* 总览视图 */}
      {selectedTab === 'overview' && (
        <div className="animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accountBooks.map(book => (
              <div
                key={book.id}
                onClick={() => setSelectedTab(book.id)}
                className="cursor-pointer group"
              >
                <div className="p-6 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-500 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{book.icon}</span>
                    <h3 className="text-xl font-semibold group-hover:text-violet-600 transition-colors">
                      {book.name}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">当前余额</span>
                      <span className="text-2xl font-bold text-violet-600">
                        ¥{parseFloat(book.currentBalance.toString()).toLocaleString('zh-CN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">初始余额</span>
                      <span>¥{parseFloat(book.initialBalance.toString()).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
