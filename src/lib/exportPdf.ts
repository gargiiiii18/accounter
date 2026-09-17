import type { Group, Expense, Settlement, Balance, SimplifiedDebt } from './types'
import { formatCurrency, formatDate, formatDateTime } from './utils'

interface ExportOptions {
  group: Group
  expenses: Expense[]
  settlements: Settlement[]
  balances: Balance[]
  debts: SimplifiedDebt[]
  totals: { totalExpenses: number; totalSettled: number; unsettled: number }
}

/**
 * Generates a full PDF summary of a group (members, balances, settlements,
 * expenses and history) and triggers a browser download.
 */
export async function exportGroupSummaryPdf({ group, expenses, settlements, balances, debts, totals }: ExportOptions): Promise<void> {
  // Loaded dynamically so jsPDF is only bundled/fetched in the browser.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  let cursorY = 60

  const memberName = (memberId: string) => group.members.find(m => m.id === memberId)?.name || 'Unknown'

  const renderTable = (
    title: string,
    head: string[],
    body: string[][],
    rightAlignedColumns: number[] = []
  ) => {
    if (cursorY > pageHeight - 140) {
      doc.addPage()
      cursorY = 60
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(24, 24, 27)
    doc.text(title, margin, cursorY)

    autoTable(doc, {
      startY: cursorY + 12,
      head: [head],
      body: body.length > 0 ? body : [['No records yet']],
      margin: { left: margin, right: margin },
      styles: { fontSize: 10, cellPadding: 5, textColor: [39, 39, 42] },
      headStyles: { fillColor: [24, 24, 27], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [244, 244, 245] },
      columnStyles: Object.fromEntries(rightAlignedColumns.map(index => [index, { halign: 'right' as const }])),
    })
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28
  }

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(24, 24, 27)
  doc.text(group.name, margin, 44)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(113, 113, 122)
  let headerY = 60
  if (group.description) {
    doc.text(group.description, margin, headerY)
    headerY += 14
  }
  doc.text(`Generated on ${formatDateTime(new Date())} \u00b7 ${group.members.length} members`, margin, headerY)
  cursorY = headerY + 30

  // Summary
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(24, 24, 27)
  doc.text('Summary', margin, cursorY)
  cursorY += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(39, 39, 42)
  doc.text(`Total Expenses: ${formatCurrency(totals.totalExpenses)}`, margin, cursorY)
  doc.text(`Total Settled: ${formatCurrency(totals.totalSettled)}`, margin + 200, cursorY)
  doc.text(`Unsettled: ${formatCurrency(totals.unsettled)}`, margin + 400, cursorY)
  cursorY += 16

  const settledUp = balances.length > 0 && balances.every(b => Math.abs(b.net) <= 0.01)
  const roundingLeftover = settledUp ? balances.reduce((max, b) => Math.max(max, Math.abs(b.net)), 0) : 0
  if (settledUp) {
    doc.setFontSize(10)
    doc.setTextColor(180, 130, 20)
    doc.text(
      roundingLeftover > 0
        ? `All members are settled up. A leftover of ${formatCurrency(roundingLeftover)} exists because expenses could not be divided exactly evenly; it is considered settled.`
        : 'All members are settled up.',
      margin,
      cursorY
    )
    cursorY += 16
  }
  cursorY += 12

  // Member Balances
  renderTable(
    'Member Balances',
    ['Member', 'Paid', 'Owed', 'Net Balance'],
    balances.map(b => [b.memberName, formatCurrency(b.paid), formatCurrency(b.owed), formatCurrency(b.net)]),
    [1, 2, 3]
  )

  // Simplified Settlements
  renderTable(
    'Simplified Settlements',
    ['Pays', 'Receives', 'Amount'],
    debts.map(d => [d.fromName, d.toName, formatCurrency(d.amount)]),
    [2]
  )

  // Expenses
  renderTable(
    `Expenses (${expenses.length})`,
    ['Date', 'Description', 'Paid By', 'Amount', 'Split Details'],
    expenses
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(expense => [
        formatDate(expense.date),
        expense.description,
        memberName(expense.paidBy),
        formatCurrency(expense.amount),
        expense.splits.map(s => `${memberName(s.memberId)}: ${formatCurrency(s.amount ?? 0)}`).join(', '),
      ]),
    [3]
  )

  // Settlements
  renderTable(
    `Settlements (${settlements.length})`,
    ['Date', 'From', 'To', 'Amount', 'Note'],
    settlements
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(settlement => [
        formatDateTime(settlement.date),
        memberName(settlement.fromMemberId),
        memberName(settlement.toMemberId),
        formatCurrency(settlement.amount),
        settlement.note || '-',
      ]),
    [3]
  )

  // Members directory
  renderTable(
    `Members (${group.members.length})`,
    ['Name', 'Email'],
    group.members.map(m => [m.name, m.email || '-'])
  )

  const fileName = `${group.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-summary-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
