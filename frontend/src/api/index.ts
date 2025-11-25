/**
 * API 模块统一导出
 */

export * from './client'
export * from './transactions'      // 新增：统一交易API
export * from './expenses'          // 保留：向后兼容
export * from './incomes'           // 保留：向后兼容
export * from './reimbursements'
export * from './investments'       // 保留：向后兼容
export * from './accountBooks'
export * from './budgets'
export * from './config'
export * from './tags'
export * from './creditAccounts'

// 注意: Templates, RecurringExpenses 暂时继续使用 Dexie.js 存储
// 因为后端尚未实现这些功能
// Tags 已迁移到后端 API
