// Calculs financiers a partir des comptes et transactions
import { accounts, transactions } from './data/finances.js'

export const getSummary = () => {
  const totalIncome = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0)

  const totalExpenses = transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0)

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  return {
    totalBalance,
    totalIncome,
    totalExpenses,
    monthlyForecast: totalIncome - totalExpenses,
    activeAccounts: accounts.length,
    budgetUsage: Math.round((totalExpenses / Math.max(totalIncome, 1)) * 100),
  }
}
