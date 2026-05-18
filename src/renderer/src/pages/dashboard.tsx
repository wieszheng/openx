import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ArrowRightLeft,
  History,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Smartphone,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Plus,
  Minus,
  Receipt
} from 'lucide-react'

// 交易记录类型
interface Transaction {
  id: string
  date: string
  category: string
  categoryIcon: React.ReactNode
  details: string
  amount: number
  balance: number
}

// 主账户数据
const mainAccount = {
  accountNumber: '4582 1100 1234 5678',
  balance: 24860.75
}

// 交易记录数据
const transactions: Transaction[] = [
  { id: '1', date: '25 Oct 2023', category: 'Shopping', categoryIcon: <ShoppingCart className="w-4 h-4" />, details: 'Amazon Online Store', amount: -84.99, balance: 24775.76 },
  { id: '2', date: '25 Oct 2023', category: 'Food', categoryIcon: <Utensils className="w-4 h-4" />, details: 'Starbucks Coffee', amount: -4.50, balance: 24860.75 },
  { id: '3', date: '24 Oct 2023', category: 'Transportation', categoryIcon: <Car className="w-4 h-4" />, details: 'Shell Gas Station', amount: -45.00, balance: 24865.25 },
  { id: '4', date: '24 Oct 2023', category: 'Housing', categoryIcon: <Home className="w-4 h-4" />, details: 'Monthly Rent Payment', amount: -1500.00, balance: 24910.25 },
  { id: '5', date: '23 Oct 2023', category: 'Utilities', categoryIcon: <Zap className="w-4 h-4" />, details: 'Electricity Bill', amount: -89.50, balance: 26410.25 },
  { id: '6', date: '22 Oct 2023', category: 'Salary', categoryIcon: <TrendingUp className="w-4 h-4" />, details: 'Salary Deposit - TechCorp Inc.', amount: +3500.00, balance: 26499.75 },
  { id: '7', date: '22 Oct 2023', category: 'Shopping', categoryIcon: <ShoppingCart className="w-4 h-4" />, details: 'Walmart Supercenter', amount: -156.32, balance: 22999.75 },
  { id: '8', date: '21 Oct 2023', category: 'Phone', categoryIcon: <Smartphone className="w-4 h-4" />, details: 'Verizon Wireless', amount: -85.00, balance: 23156.07 },
]

// 储蓄账户数据
const savingsAccount = {
  accountNumber: '4582 2200 8765 4321',
  balance: 15420.50
}

// 右侧面板数据
const upcomingPayments = [
  { name: 'Netflix Subscription', amount: -15.99, date: '28 Oct' },
  { name: 'Spotify Premium', amount: -9.99, date: '30 Oct' },
  { name: 'Amazon Prime', amount: -14.99, date: '15 Nov' },
]

const expensesByCategory = [
  { name: 'Shopping', amount: 241.31, percentage: 32, color: 'bg-blue-500' },
  { name: 'Food', amount: 180.50, percentage: 24, color: 'bg-green-500' },
  { name: 'Transportation', amount: 130.00, percentage: 17, color: 'bg-yellow-500' },
  { name: 'Utilities', amount: 89.50, percentage: 12, color: 'bg-purple-500' },
  { name: 'Other', amount: 115.69, percentage: 15, color: 'bg-gray-500' },
]

export function DashboardPage(): React.JSX.Element {
  const [isAccountExpanded, setIsAccountExpanded] = useState(true)
  const [isSavingsExpanded, setIsSavingsExpanded] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="flex gap-6 h-full">
      {/* 左侧主内容区 */}
      <div className="flex-1 flex flex-col gap-6 overflow-auto">
        {/* 主账户卡片 */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <CreditCard className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Main Account</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono tracking-wide">{mainAccount.accountNumber}</span>
                <button
                  onClick={() => handleCopy(mainAccount.accountNumber, 'mainAccount')}
                  className="p-1 rounded hover:bg-accent transition-colors"
                  title="Copy"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
                {copiedField === 'mainAccount' && (
                  <span className="text-xs text-green-500">Copied!</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsAccountExpanded(!isAccountExpanded)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              {isAccountExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>

          {isAccountExpanded && (
            <>
              <div className="mb-6">
                <span className="text-4xl font-bold tracking-tight">
                  {formatCurrency(mainAccount.balance)}
                </span>
              </div>

              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
                  <ArrowRightLeft className="w-4 h-4" />
                  New Transfer
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-xl hover:bg-accent/80 transition-colors">
                  <History className="w-4 h-4" />
                  Full History
                </button>
              </div>
            </>
          )}
        </div>

        {/* 交易记录表格 */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Recent Transactions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 text-sm">{transaction.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-accent">{transaction.categoryIcon}</span>
                        <span className="text-sm">{transaction.category}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{transaction.details}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${
                      transaction.amount > 0 ? 'text-green-500' : 'text-foreground'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                      {formatCurrency(transaction.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 储蓄账户卡片 */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <PiggyBank className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Savings Account</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono tracking-wide text-muted-foreground">
                  {savingsAccount.accountNumber}
                </span>
                <button
                  onClick={() => handleCopy(savingsAccount.accountNumber, 'savingsAccount')}
                  className="p-1 rounded hover:bg-accent transition-colors"
                  title="Copy"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsSavingsExpanded(!isSavingsExpanded)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              {isSavingsExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>

          {isSavingsExpanded && (
            <div className="mb-4">
              <span className="text-3xl font-bold tracking-tight">
                {formatCurrency(savingsAccount.balance)}
              </span>
              <p className="text-sm text-muted-foreground mt-1">Account Balance</p>
            </div>
          )}
        </div>
      </div>

      {/* 右侧边栏 */}
      <aside className="w-80 flex flex-col gap-6 overflow-auto">
        {/* 即将到账/待支付 */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Upcoming Payments
          </h3>
          <div className="space-y-3">
            {upcomingPayments.map((payment, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{payment.name}</p>
                  <p className="text-xs text-muted-foreground">{payment.date}</p>
                </div>
                <span className="text-sm font-medium text-destructive">
                  {formatCurrency(Math.abs(payment.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 推广横幅 */}
        <div className="bg-gradient-to-br from-primary to-primary/70 rounded-2xl p-5 text-primary-foreground">
          <h3 className="text-lg font-semibold mb-2">Limited Time Offer!</h3>
          <p className="text-sm opacity-90 mb-4">
            Get 3% cashback on all your purchases this month. No minimum required.
          </p>
          <button className="w-full py-2 bg-primary-foreground text-primary rounded-xl font-medium hover:bg-primary-foreground/90 transition-colors">
            Learn More
          </button>
        </div>

        {/* 本月支出饼图 */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            This Month Expenses
          </h3>
          
          {/* 简易饼图 */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* 背景圆环 */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-muted"
                />
                {/* 动态生成各区块 */}
                {(() => {
                  let currentAngle = 0
                  return expensesByCategory.map((cat, index) => {
                    const angle = (cat.percentage / 100) * 360
                    const startAngle = currentAngle
                    currentAngle += angle
                    const colors = ['text-blue-500', 'text-green-500', 'text-yellow-500', 'text-purple-500', 'text-gray-500']
                    
                    return (
                      <circle
                        key={index}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeDasharray={`${angle * 2.51} ${251.2 - angle * 2.51}`}
                        strokeDashoffset={-startAngle * 2.51}
                        className={colors[index]}
                      />
                    )
                  })
                })()}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-bold">$756.00</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* 图例 */}
          <div className="space-y-2">
            {expensesByCategory.map((cat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${cat.color}`} />
                  <span className="text-sm">{cat.name}</span>
                </div>
                <span className="text-sm font-medium">${cat.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
