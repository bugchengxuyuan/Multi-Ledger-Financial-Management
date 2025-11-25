import { Expense, Reimbursement, Investment, FinanceStats, Tag } from '@/store/types'
import { formatCurrency, formatShortDate } from './formatters'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

// 将数据转换为CSV格式
function convertToCSV(data: any[], headers: string[]): string {
  const rows = [headers.join(',')]

  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header] || ''
      // 处理包含逗号的值
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`
      }
      return value
    })
    rows.push(row.join(','))
  })

  return rows.join('\n')
}

// 下载文件
function downloadFile(content: string, filename: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 导出支出数据
export function exportExpenses(expenses: Expense[], tags: Tag[]) {
  const data = expenses.map(exp => {
    const categoryTag = tags.find(t => t.id === exp.categoryTagId)
    const categoryName = categoryTag ? categoryTag.name : '未知分类'
    const labelTags = exp.labelTagIds?.map(id => tags.find(t => t.id === id)?.name).filter(Boolean).join(', ') || '-'

    return {
      '日期': formatShortDate(exp.date),
      '分类': categoryName,
      '金额': exp.amount,
      '说明': exp.description,
      '标签': labelTags,
      '需要报销': exp.needsReimbursement ? '是' : '否',
      '创建时间': formatShortDate(exp.createdAt),
    }
  })

  const csv = convertToCSV(data, ['日期', '分类', '金额', '说明', '标签', '需要报销', '创建时间'])
  const filename = `支出记录_${new Date().toISOString().split('T')[0]}.csv`
  downloadFile(csv, filename)
}

// 导出报销数据
export function exportReimbursements(reimbursements: Reimbursement[]) {
  const data = reimbursements.map(reimb => ({
    '支出日期': formatShortDate(reimb.date),
    '报销项目': reimb.item,
    '金额': reimb.amount,
    '备注': reimb.note,
    '状态': reimb.status === 'pending' ? '待报销' : '已报销',
    '报销日期': reimb.reimbursedDate ? formatShortDate(reimb.reimbursedDate) : '-',
    '创建时间': formatShortDate(reimb.createdAt),
  }))

  const csv = convertToCSV(data, ['支出日期', '报销项目', '金额', '备注', '状态', '报销日期', '创建时间'])
  const filename = `报销记录_${new Date().toISOString().split('T')[0]}.csv`
  downloadFile(csv, filename)
}

// 导出投资数据
export function exportInvestments(investments: Investment[]) {
  const data = investments.map(inv => ({
    '名称': inv.name,
    '类型': inv.type === 'precious_metal' ? '贵金属' : inv.type === 'equity' ? '权益类' : '固收类',
    '金额': inv.amount,
    '状态': inv.status === 'holding' ? '持有中' : '已卖出',
    '购买日期': formatShortDate(inv.purchaseDate),
    '备注': inv.note || '-',
  }))

  const csv = convertToCSV(data, ['名称', '类型', '金额', '状态', '购买日期', '备注'])
  const filename = `投资记录_${new Date().toISOString().split('T')[0]}.csv`
  downloadFile(csv, filename)
}

// 导出全部数据
export function exportAllData(
  expenses: Expense[],
  reimbursements: Reimbursement[],
  investments: Investment[],
  stats: FinanceStats | null,
  tags: Tag[]
) {
  let content = '借呗财务管理系统 - 数据导出报告\n'
  content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`

  // 财务统计
  if (stats) {
    content += '=== 财务统计 ===\n'
    content += `总支出: ${formatCurrency(stats.totalSpent)}\n`
    content += `可用额度: ${formatCurrency(stats.availableCredit)}\n`
    content += `必须保留: ${formatCurrency(stats.mustKeep)}\n`
    content += `安全可花: ${formatCurrency(stats.safeToSpend)}\n`
    content += `总投资: ${formatCurrency(stats.totalInvestment)}\n`
    content += `待报销: ${formatCurrency(stats.pendingReimbursement)}\n\n`
  }

  // 支出记录
  content += '=== 支出记录 ===\n'
  content += '日期,分类,金额,说明,需要报销\n'
  expenses.forEach(exp => {
    const categoryTag = tags.find(t => t.id === exp.categoryTagId)
    const categoryName = categoryTag ? categoryTag.name : '未知分类'
    content += `${formatShortDate(exp.date)},${categoryName},${exp.amount},${exp.description},${exp.needsReimbursement ? '是' : '否'}\n`
  })
  content += '\n'

  // 报销记录
  content += '=== 报销记录 ===\n'
  content += '支出日期,报销项目,金额,状态,报销日期\n'
  reimbursements.forEach(reimb => {
    content += `${formatShortDate(reimb.date)},${reimb.item},${reimb.amount},${reimb.status === 'pending' ? '待报销' : '已报销'},${reimb.reimbursedDate ? formatShortDate(reimb.reimbursedDate) : '-'}\n`
  })
  content += '\n'

  // 投资记录
  content += '=== 投资记录 ===\n'
  content += '名称,类型,金额,状态,购买日期\n'
  investments.forEach(inv => {
    const type = inv.type === 'precious_metal' ? '贵金属' : inv.type === 'equity' ? '权益类' : '固收类'
    content += `${inv.name},${type},${inv.amount},${inv.status === 'holding' ? '持有中' : '已卖出'},${formatShortDate(inv.purchaseDate)}\n`
  })

  const filename = `财务数据完整导出_${new Date().toISOString().split('T')[0]}.csv`
  downloadFile(content, filename)
}

// 导出支出到Excel
export function exportExpensesToExcel(expenses: Expense[], tags: Tag[]) {
  const data = expenses.map(exp => {
    const categoryTag = tags.find(t => t.id === exp.categoryTagId)
    const categoryName = categoryTag ? categoryTag.name : '未知分类'
    const labelTags = exp.labelTagIds?.map(id => tags.find(t => t.id === id)?.name).filter(Boolean).join(', ') || '-'

    return {
      '日期': formatShortDate(exp.date),
      '分类': categoryName,
      '金额': exp.amount,
      '说明': exp.description,
      '需要报销': exp.needsReimbursement ? '是' : '否',
      '标签': labelTags,
      '账本': exp.accountBookId || '默认',
      '创建时间': formatShortDate(exp.createdAt),
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '支出记录')

  // 设置列宽
  worksheet['!cols'] = [
    { wch: 12 }, // 日期
    { wch: 10 }, // 分类
    { wch: 10 }, // 金额
    { wch: 30 }, // 说明
    { wch: 10 }, // 需要报销
    { wch: 20 }, // 标签
    { wch: 12 }, // 账本
    { wch: 12 }, // 创建时间
  ]

  const filename = `支出记录_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, filename)
}

// 导出全部数据到Excel（多个工作表）
export function exportAllDataToExcel(
  expenses: Expense[],
  reimbursements: Reimbursement[],
  investments: Investment[],
  stats: FinanceStats | null,
  tags: Tag[]
) {
  const workbook = XLSX.utils.book_new()

  // 财务统计工作表
  if (stats) {
    const statsData = [
      { '项目': '总支出', '金额': stats.totalSpent },
      { '项目': '可用额度', '金额': stats.availableCredit },
      { '项目': '必须保留', '金额': stats.mustKeep },
      { '项目': '安全可花', '金额': stats.safeToSpend },
      { '项目': '总投资', '金额': stats.totalInvestment },
      { '项目': '待报销', '金额': stats.pendingReimbursement },
    ]
    const statsSheet = XLSX.utils.json_to_sheet(statsData)
    statsSheet['!cols'] = [{ wch: 15 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, statsSheet, '财务统计')
  }

  // 支出记录工作表
  const expensesData = expenses.map(exp => {
    const categoryTag = tags.find(t => t.id === exp.categoryTagId)
    const categoryName = categoryTag ? categoryTag.name : '未知分类'
    const labelTags = exp.labelTagIds?.map(id => tags.find(t => t.id === id)?.name).filter(Boolean).join(', ') || '-'

    return {
      '日期': formatShortDate(exp.date),
      '分类': categoryName,
      '金额': exp.amount,
      '说明': exp.description,
      '需要报销': exp.needsReimbursement ? '是' : '否',
      '标签': labelTags,
      '账本': exp.accountBookId || '默认',
      '创建时间': formatShortDate(exp.createdAt),
    }
  })
  const expensesSheet = XLSX.utils.json_to_sheet(expensesData)
  expensesSheet['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 30 },
    { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 12 }
  ]
  XLSX.utils.book_append_sheet(workbook, expensesSheet, '支出记录')

  // 报销记录工作表
  const reimbData = reimbursements.map(reimb => ({
    '支出日期': formatShortDate(reimb.date),
    '报销项目': reimb.item,
    '金额': reimb.amount,
    '备注': reimb.note,
    '状态': reimb.status === 'pending' ? '待报销' : '已报销',
    '报销日期': reimb.reimbursedDate ? formatShortDate(reimb.reimbursedDate) : '-',
    '创建时间': formatShortDate(reimb.createdAt),
  }))
  const reimbSheet = XLSX.utils.json_to_sheet(reimbData)
  reimbSheet['!cols'] = [
    { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 25 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }
  ]
  XLSX.utils.book_append_sheet(workbook, reimbSheet, '报销记录')

  // 投资记录工作表
  const invData = investments.map(inv => ({
    '名称': inv.name,
    '类型': inv.type === 'precious_metal' ? '贵金属' : inv.type === 'equity' ? '权益类' : '固收类',
    '金额': inv.amount,
    '状态': inv.status === 'holding' ? '持有中' : '已卖出',
    '购买日期': formatShortDate(inv.purchaseDate),
    '备注': inv.note || '-',
  }))
  const invSheet = XLSX.utils.json_to_sheet(invData)
  invSheet['!cols'] = [
    { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }
  ]
  XLSX.utils.book_append_sheet(workbook, invSheet, '投资记录')

  const filename = `财务数据完整导出_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, filename)
}

// 导出全部数据到PDF
export function exportAllDataToPDF(
  expenses: Expense[],
  reimbursements: Reimbursement[],
  investments: Investment[],
  stats: FinanceStats | null,
  tags: Tag[]
) {
  const doc = new jsPDF()

  // 设置中文字体（使用默认字体，可能不完全支持中文）
  doc.setFont('helvetica')

  let yPosition = 20
  const lineHeight = 7
  const pageHeight = doc.internal.pageSize.height
  const marginBottom = 20

  // 添加新页检查
  const checkAddPage = () => {
    if (yPosition > pageHeight - marginBottom) {
      doc.addPage()
      yPosition = 20
    }
  }

  // 标题
  doc.setFontSize(18)
  doc.text('Jiebei Finance Management System', 105, yPosition, { align: 'center' })
  yPosition += 10

  doc.setFontSize(12)
  doc.text(`Export Date: ${new Date().toLocaleString('zh-CN')}`, 105, yPosition, { align: 'center' })
  yPosition += 15

  // 财务统计
  if (stats) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Financial Statistics', 20, yPosition)
    yPosition += lineHeight + 2

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const statsItems = [
      { label: 'Total Spent', value: formatCurrency(stats.totalSpent) },
      { label: 'Available Credit', value: formatCurrency(stats.availableCredit) },
      { label: 'Must Keep', value: formatCurrency(stats.mustKeep) },
      { label: 'Safe to Spend', value: formatCurrency(stats.safeToSpend) },
      { label: 'Total Investment', value: formatCurrency(stats.totalInvestment) },
      { label: 'Pending Reimbursement', value: formatCurrency(stats.pendingReimbursement) },
    ]

    statsItems.forEach(item => {
      checkAddPage()
      doc.text(`${item.label}: ${item.value}`, 25, yPosition)
      yPosition += lineHeight
    })
    yPosition += 5
  }

  // 支出记录（最近20条）
  checkAddPage()
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Recent Expenses (Top 20)', 20, yPosition)
  yPosition += lineHeight + 2

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)

  recentExpenses.forEach((exp, index) => {
    checkAddPage()
    const categoryTag = tags.find(t => t.id === exp.categoryTagId)
    const categoryName = categoryTag?.name || 'Unknown'
    const line = `${index + 1}. ${formatShortDate(exp.date)} | ${categoryName} | ${formatCurrency(exp.amount)} | ${exp.description}`
    doc.text(line, 25, yPosition)
    yPosition += lineHeight
  })
  yPosition += 5

  // 报销记录摘要
  if (reimbursements.length > 0) {
    checkAddPage()
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Reimbursement Summary', 20, yPosition)
    yPosition += lineHeight + 2

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    const pendingCount = reimbursements.filter(r => r.status === 'pending').length
    const completedCount = reimbursements.filter(r => r.status === 'reimbursed').length
    const totalReimbAmount = reimbursements.reduce((sum, r) => sum + r.amount, 0)

    doc.text(`Total Items: ${reimbursements.length}`, 25, yPosition)
    yPosition += lineHeight
    doc.text(`Pending: ${pendingCount} | Completed: ${completedCount}`, 25, yPosition)
    yPosition += lineHeight
    doc.text(`Total Amount: ${formatCurrency(totalReimbAmount)}`, 25, yPosition)
    yPosition += lineHeight + 5
  }

  // 投资记录摘要
  if (investments.length > 0) {
    checkAddPage()
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Investment Summary', 20, yPosition)
    yPosition += lineHeight + 2

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    const holdingInv = investments.filter(i => i.status === 'holding')
    const soldInv = investments.filter(i => i.status === 'sold')

    doc.text(`Total Investments: ${investments.length}`, 25, yPosition)
    yPosition += lineHeight
    doc.text(`Holding: ${holdingInv.length} | Sold: ${soldInv.length}`, 25, yPosition)
    yPosition += lineHeight
  }

  // 页脚
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(`Page ${i} of ${pageCount}`, 105, pageHeight - 10, { align: 'center' })
  }

  const filename = `财务报告_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
