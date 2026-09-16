// Donnees financieres fictives, en attendant la base de donnees
export const accounts = [
  { id: 'acc-1', name: 'Compte courant', balance: 18250 },
  { id: 'acc-2', name: 'Compte épargne', balance: 6400 },
  { id: 'acc-3', name: 'Fonds travaux', balance: 12400 },
]

export const transactions = [
  { id: 'txn-1', type: 'income', category: 'Revenus', label: 'Cotisations mensuelles', amount: 4200, date: '2026-08-05' },
  { id: 'txn-2', type: 'expense', category: 'Électricité', label: 'Facture d’électricité', amount: 1260, date: '2026-08-12' },
  { id: 'txn-3', type: 'expense', category: 'Entretien', label: 'Plomberie et réparation', amount: 870, date: '2026-08-17' },
  { id: 'txn-4', type: 'income', category: 'Travaux', label: 'Remboursement travaux', amount: 1800, date: '2026-08-20' },
]

export const budgets = [
  { id: 'budget-1', category: 'Électricité', planned: 2200, used: 1260, progress: 57 },
  { id: 'budget-2', category: 'Entretien', planned: 1800, used: 870, progress: 48 },
  { id: 'budget-3', category: 'Sécurité', planned: 1000, used: 320, progress: 32 },
]
