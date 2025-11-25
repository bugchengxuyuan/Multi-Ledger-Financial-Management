# CLAUDE.md - AI Assistant Guide for Jiebei Finance Management System

## Project Overview

**Project Name**: 借呗财务管理系统 (Jiebei Finance Management System)
**Purpose**: A professional personal finance management system for tracking expenses, managing reimbursements, planning budgets, and managing investment assets
**Status**: Production-ready (Backend 100% complete, Core UI 95% complete)
**Last Updated**: 2025-11-17

### Tech Stack
- **Framework**: React 18.2 with TypeScript 5.2 (Strict mode enabled)
- **Build Tool**: Vite 5.0.8
- **Styling**: Tailwind CSS 3.4 with shadcn/ui components
- **State Management**: Zustand 4.4.7
- **Database**: Dexie.js 3.2.4 (IndexedDB wrapper) - Schema Version 3
- **Charts**: Recharts 2.10.3
- **Icons**: Lucide React 0.303
- **Form Handling**: React Hook Form 7.49 + Zod 3.22 validation
- **Date Handling**: date-fns 3.0.6
- **Export**: xlsx 0.18.5, jspdf 3.0.3
- **UI Components**:
  - @radix-ui primitives (dialog, tabs, progress, select, toast, etc.)
  - class-variance-authority for component variants
  - tailwind-merge for className merging
  - tailwindcss-animate for animations

### Key Features
1. **Dashboard**: Financial health scoring (0-100), trend analysis, smart insights
2. **Expense Tracking**: Advanced filtering, batch operations, anomaly detection
3. **Reimbursement Management**: Bidirectional expense-reimbursement linking
4. **Investment Assets**: Portfolio tracking with status management
5. **Planning**: Budget configuration, recurring expenses, financial goals
6. **Settings**: Theme management (light/dark), data export (CSV/Excel/PDF)

---

## Codebase Structure

```
jiebei/
├── src/
│   ├── components/
│   │   └── ui/              # shadcn/ui components (8 components)
│   │       ├── alert.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── select.tsx
│   │       └── tabs.tsx
│   │
│   ├── contexts/
│   │   └── ThemeContext.tsx # Dark/light theme management
│   │
│   ├── db/
│   │   ├── database.ts      # Dexie database schema (Version 3, 9 tables)
│   │   └── initialData.ts   # Database initialization and seed data
│   │
│   ├── lib/
│   │   └── utils.ts         # Utility helpers (cn() for className merging)
│   │
│   ├── pages/               # Main application pages (6 pages)
│   │   ├── Dashboard.tsx    # Financial overview and health score (715 lines)
│   │   ├── Expenses.tsx     # Expense management with advanced features (1,258 lines)
│   │   ├── Planning.tsx     # Budget and financial planning (637 lines)
│   │   ├── Investment.tsx   # Investment portfolio tracking (374 lines)
│   │   ├── Reimbursement.tsx # Reimbursement tracking (277 lines)
│   │   └── Settings.tsx     # App settings and data export (191 lines)
│   │
│   ├── store/
│   │   ├── types.ts         # TypeScript type definitions (15+ interfaces)
│   │   └── useFinanceStore.ts # Zustand store (666 lines, all CRUD operations)
│   │
│   ├── utils/               # Business logic and utilities (2,117 lines total)
│   │   ├── budgetManager.ts     # Budget calculations and recommendations (203 lines)
│   │   ├── calculations.ts      # Financial calculations (44 lines)
│   │   ├── constants.ts         # App-wide constants (19 lines)
│   │   ├── expenseAnalytics.ts  # Anomaly detection and habit analysis (288 lines)
│   │   ├── exportData.ts        # CSV/Excel/PDF export logic (396 lines)
│   │   ├── formatters.ts        # Number and date formatting (28 lines)
│   │   ├── insights.ts          # Health score and smart insights (372 lines)
│   │   └── smartInput.ts        # Smart autocomplete and recommendations (328 lines)
│   │
│   ├── App.tsx              # Main app component with routing
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles and Tailwind imports
│
├── public/                  # Static assets
├── index.html               # HTML template
├── package.json             # Dependencies and scripts (55 lines)
├── tsconfig.json            # TypeScript configuration (strict mode, 32 lines)
├── tsconfig.node.json       # Node-specific TypeScript config
├── tailwind.config.js       # Tailwind configuration with 7 custom animations (106 lines)
├── vite.config.ts           # Vite configuration with path aliases (18 lines)
├── postcss.config.js        # PostCSS configuration for Tailwind
├── netlify.toml             # Netlify deployment config
├── vercel.json              # Vercel deployment config (optional)
├── tunnel.js                # Local tunnel utility (for development)
├── README.md                # User-facing documentation (Chinese, 74 lines)
├── CLAUDE.md                # AI assistant guide (this file, 1,180+ lines)
├── CODEBASE_ANALYSIS.md     # Comprehensive technical analysis (1,293 lines)
└── IMPLEMENTATION_SUMMARY.md # Detailed implementation summary (Chinese, 369 lines)
```

---

## Architecture & Design Patterns

### State Management Pattern (Zustand)

The app uses a single, centralized Zustand store (`useFinanceStore`) with the following structure:

```typescript
interface FinanceStore {
  // State
  expenses: Expense[]
  reimbursements: Reimbursement[]
  investments: Investment[]
  config: FinanceConfig | null
  tags: Tag[]
  accountBooks: AccountBook[]
  budgets: Budget[]
  expenseTemplates: ExpenseTemplate[]
  recurringExpenses: RecurringExpense[]
  stats: FinanceStats | null
  isLoading: boolean

  // Actions (grouped by entity)
  // - loadData, calculateStats
  // - addExpense, updateExpense, deleteExpense
  // - addReimbursement, updateReimbursement, deleteReimbursement
  // - addInvestment, updateInvestment, deleteInvestment
  // - updateConfig
  // - addTag, updateTag, deleteTag
  // - addAccountBook, updateAccountBook, deleteAccountBook, setDefaultAccountBook
  // - addBudget, updateBudget, deleteBudget
  // - addExpenseTemplate, updateExpenseTemplate, deleteExpenseTemplate
  // - addRecurringExpense, updateRecurringExpense, deleteRecurringExpense, executeRecurringExpense
}
```

**Key Principles**:
1. **Single Source of Truth**: All application state lives in one store
2. **Async Operations**: All CRUD operations are async and update both IndexedDB and store state
3. **Optimistic Updates**: UI updates immediately, with database sync happening in background
4. **Data Integrity**: Bidirectional relationships are maintained (e.g., expense ↔ reimbursement)

### Database Schema (Dexie.js - IndexedDB)

**Version 3** - Current schema with 9 tables:

```javascript
// Primary entities
expenses:          'id, date, category, amount, needsReimbursement, reimbursementId, accountBookId, *tags'
reimbursements:    'id, date, status, amount, expenseId'
investments:       'id, type, status, amount'
config:            'id'

// Advanced features (Version 3)
tags:              'id, name'
accountBooks:      'id, name, isDefault'
budgets:           'id, category, period, accountBookId'
expenseTemplates:  'id, name, category'
recurringExpenses: 'id, name, frequency, enabled'
```

**Important Notes**:
- `*tags` in expenses table enables multi-value indexing for tag filtering
- Always update both `createdAt` and `updatedAt` timestamps
- Use `db.transaction()` for operations affecting multiple tables

### Data Models (Core Types)

Located in `src/store/types.ts`:

#### 1. Expense (Main Entity)
```typescript
interface Expense {
  id: string
  date: string                  // ISO 8601 format
  category: string              // e.g., "餐饮", "交通", "购物"
  amount: number
  description: string
  needsReimbursement?: boolean  // Marks if expense should be reimbursed
  reimbursementId?: string      // Links to Reimbursement record
  tags?: string[]               // Multi-tag support
  accountBookId?: string        // Links to AccountBook
  note?: string
  receiptPhoto?: string         // URL to receipt image
  location?: string
  createdAt: string
  updatedAt: string
}
```

#### 2. Reimbursement
```typescript
interface Reimbursement {
  id: string
  date: string
  item: string
  amount: number
  note: string
  status: 'pending' | 'reimbursed'
  reimbursedDate?: string
  expenseId?: string            // Bidirectional link to Expense
  createdAt: string
  updatedAt: string
}
```

#### 3. Investment
```typescript
interface Investment {
  id: string
  type: '贵金属' | '股权投资' | '固收理财'
  description: string
  amount: number
  date: string
  status: '持有中' | '已卖出'
  createdAt: string
  updatedAt: string
}
```

#### 4. RecurringExpense
```typescript
interface RecurringExpense {
  id: string
  name: string
  category: string
  amount: number
  description: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  dayOfWeek?: number            // 0-6 (for weekly)
  dayOfMonth?: number           // 1-31 (for monthly)
  monthOfYear?: number          // 1-12 (for yearly)
  startDate: string
  endDate?: string
  lastExecuted?: string
  enabled: boolean
  autoCreate: boolean
  createdAt: string
  updatedAt: string
}
```

#### 5. Budget
```typescript
interface Budget {
  id: string
  category: string              // Category name or "总预算"
  amount: number
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string
  accountBookId?: string        // Optional: null = global budget
  warningThreshold: number      // Percentage (e.g., 80 = warn at 80%)
  createdAt: string
  updatedAt: string
}
```

---

## Development Workflows

### Setting Up Development Environment

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### TypeScript Configuration

**Strict Mode Enabled** - Zero tolerance for type issues:
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `target: ES2020`
- `lib: ["ES2020", "DOM", "DOM.Iterable"]`
- `jsx: react-jsx`

**Path Alias**: `@/` → `./src/`

Example usage:
```typescript
import { useFinanceStore } from '@/store/useFinanceStore'
import { db } from '@/db/database'
```

**Module Configuration**:
- Module: ESNext
- Module Resolution: bundler (Vite optimized)
- Isolated Modules: true (for faster builds)

### Adding New Features

When implementing new features, follow this workflow:

1. **Define Types First** (`src/store/types.ts`)
   ```typescript
   export interface NewFeature {
     id: string
     // ... fields
     createdAt: string
     updatedAt: string
   }
   ```

2. **Update Database Schema** (`src/db/database.ts`)
   ```typescript
   this.version(4).stores({
     // ... existing tables
     newFeatures: 'id, indexedField1, indexedField2',
   })
   ```

3. **Add Store Actions** (`src/store/useFinanceStore.ts`)
   ```typescript
   addNewFeature: async (data: Omit<NewFeature, 'id' | 'createdAt' | 'updatedAt'>) => {
     const id = crypto.randomUUID()
     const now = new Date().toISOString()
     const newFeature = { ...data, id, createdAt: now, updatedAt: now }

     await db.newFeatures.add(newFeature)
     set(state => ({ newFeatures: [...state.newFeatures, newFeature] }))

     return id
   }
   ```

4. **Create UI Components** (`src/pages/` or `src/components/`)
5. **Add Utility Functions** if needed (`src/utils/`)

### Working with the Database

**Loading Data**:
```typescript
const expenses = await db.expenses.toArray()
const config = await db.config.get('main')
```

**Parallel Loading** (Recommended):
```typescript
const [expenses, reimbursements] = await Promise.all([
  db.expenses.toArray(),
  db.reimbursements.toArray(),
])
```

**Filtering**:
```typescript
// By index
const expenses = await db.expenses.where('category').equals('餐饮').toArray()

// By date range
const expenses = await db.expenses
  .where('date')
  .between(startDate, endDate, true, true)
  .toArray()

// By tags (multi-value index)
const expenses = await db.expenses.where('tags').equals('工作').toArray()
```

**Updating**:
```typescript
await db.expenses.update(id, {
  amount: newAmount,
  updatedAt: new Date().toISOString(),
})
```

**Deleting with Cascade**:
```typescript
// When deleting a tag, remove it from all expenses
await db.transaction('rw', db.tags, db.expenses, async () => {
  await db.tags.delete(tagId)
  const expenses = await db.expenses.where('tags').equals(tagId).toArray()
  for (const expense of expenses) {
    await db.expenses.update(expense.id, {
      tags: expense.tags?.filter(t => t !== tagId),
      updatedAt: new Date().toISOString(),
    })
  }
})
```

---

## Code Conventions & Best Practices

### 1. Component Organization

**Page Components** (`src/pages/`):
- One page per file
- Use functional components with hooks
- Keep business logic in `src/utils/`
- Use `useMemo` for expensive calculations (10+ instances in codebase)

Example structure:
```typescript
function Dashboard() {
  const { expenses, config, stats } = useFinanceStore()

  const healthScore = useMemo(() =>
    calculateHealthScore(expenses, config, stats),
    [expenses, config, stats]
  )

  return (
    <div className="p-6">
      {/* UI */}
    </div>
  )
}
```

### 2. Styling Conventions

**Tailwind Classes**:
- Use `className` with template literals for conditional classes
- Use `cn()` from `@/lib/utils` for complex class merging
- Follow semantic color system:
  - `green-600`: Success, healthy status
  - `orange-600`: Warning, attention needed
  - `red-600`: Danger, error, exceeded
  - `blue-600`: Info, neutral
  - `violet-600` to `indigo-600`: Primary brand gradient

**Dark Mode**:
- Always provide both light and dark variants: `bg-white dark:bg-slate-900`
- Use `dark:` prefix for all color utilities
- Theme state managed by `ThemeContext`

**Typography Scale**:
```css
Display-1: text-7xl/text-8xl     (Financial health score)
Display-2: text-5xl/text-6xl     (Main metrics)
Display-3: text-4xl              (Section headers)
Heading:   text-3xl              (Page titles)
Body:      text-sm/text-base     (Regular text)
```

**Gradients** (Brand Identity):
```tsx
// Primary gradient
className="bg-gradient-to-r from-violet-600 to-indigo-600"

// Background gradient
className="bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50
           dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
```

**Custom Animations** (Tailwind Config):
```javascript
// 7 custom animations defined in tailwind.config.js
- fade-in: Fade in with slide up effect
- slide-up: Slide up animation
- gradient-shift: Animated gradient background
- pulse-glow: Pulsing glow effect
- shimmer: Shimmer loading effect
- accordion-down/up: Accordion expand/collapse
```

### 3. Performance Optimization

**Memoization**:
```typescript
// Expensive calculations
const sortedExpenses = useMemo(() =>
  [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)),
  [expenses]
)

// Complex filters
const filteredExpenses = useMemo(() =>
  expenses.filter(e => matchesFilter(e, filters)),
  [expenses, filters]
)
```

**Parallel Data Loading**:
```typescript
// Good: Parallel
const [expenses, reimbursements, investments] = await Promise.all([
  db.expenses.toArray(),
  db.reimbursements.toArray(),
  db.investments.toArray(),
])

// Bad: Sequential
const expenses = await db.expenses.toArray()
const reimbursements = await db.reimbursements.toArray()
const investments = await db.investments.toArray()
```

### 4. Error Handling

```typescript
try {
  await db.expenses.add(expense)
  set(state => ({ expenses: [...state.expenses, expense] }))
} catch (error) {
  console.error('Failed to add expense:', error)
  // Optionally: Show toast notification to user
  throw error // Re-throw to allow caller to handle
}
```

### 5. Date Handling

**Always use ISO 8601 format**:
```typescript
import { format, parseISO } from 'date-fns'

// Storing
const expense = {
  date: new Date().toISOString(), // "2025-11-16T10:30:00.000Z"
  createdAt: new Date().toISOString(),
}

// Displaying
const displayDate = format(parseISO(expense.date), 'yyyy-MM-dd')
const displayTime = format(parseISO(expense.createdAt), 'HH:mm:ss')
```

### 6. ID Generation

**Use crypto.randomUUID()**:
```typescript
const id = crypto.randomUUID() // "550e8400-e29b-41d4-a716-446655440000"
```

### 7. Naming Conventions

- **Components**: PascalCase (`Dashboard.tsx`, `ExpenseCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useFinanceStore.ts`, `useTheme.ts`)
- **Utilities**: camelCase (`budgetManager.ts`, `formatters.ts`)
- **Types/Interfaces**: PascalCase (`Expense`, `FinanceConfig`)
- **Constants**: UPPER_SNAKE_CASE or camelCase based on context

---

## Key Business Logic & Algorithms

### 1. Financial Health Score (0-100)

Located in `src/utils/insights.ts`:

```typescript
calculateHealthScore(expenses, config, stats): number
```

**Algorithm**:
```
Total Score (100) =
  Safe to Spend Score (30 points) +
  Usage Rate Score (25 points) +
  Over-budget Record Score (20 points) +
  Reimbursement Ratio Score (15 points) +
  Spending Trend Score (10 points)

Grading:
- Excellent: 90-100 (Green)
- Good: 70-89 (Blue)
- Caution: 50-69 (Orange)
- Danger: 0-49 (Red)
```

### 2. Anomaly Detection

Located in `src/utils/expenseAnalytics.ts`:

**Large Amount Detection**:
```typescript
amount > averageAmount * 2
```

**Unusual Growth**:
```typescript
thisWeekTotal > lastWeekTotal * 1.5
```

**Late Night Expenses**:
```typescript
time >= 22:00 || time <= 6:00
count >= 3 (in last 7 days)
```

### 3. Periodic Expense Detection

Located in `src/utils/expenseAnalytics.ts`:

**Criteria**:
1. Data from last 6 months
2. Same category + similar amount (±20%) ≥ 3 occurrences
3. Stable interval: `stdDev < avgInterval * 0.3`
4. Weekly pattern: 5-9 day interval
5. Monthly pattern: 25-35 day interval

**Confidence Score**:
```typescript
confidence = (sameDayOccurrences / totalOccurrences) * 100
```

### 4. Recurring Expense Auto-Execution

Located in `src/store/useFinanceStore.ts`:

```typescript
checkAndExecuteRecurring()
```

**Logic**:
- **Daily**: Execute if `lastExecuted !== today`
- **Weekly**: Execute if `dayOfWeek matches && gap > 6 days`
- **Monthly**: Execute if `dayOfMonth matches && different month`
- **Yearly**: Execute if `month + day match && different year`

### 5. Budget Status Calculation

Located in `src/utils/budgetManager.ts`:

```typescript
interface BudgetStatus {
  budget: Budget
  spent: number
  remaining: number
  percentage: number
  status: 'ok' | 'warning' | 'exceeded'
}
```

**Status Determination**:
- `ok`: percentage < warningThreshold
- `warning`: percentage >= warningThreshold && < 100
- `exceeded`: percentage >= 100

### 6. Smart Input Suggestions

Located in `src/utils/smartInput.ts`:

**Description Autocomplete**:
```typescript
getDescriptionSuggestions(input: string, expenses: Expense[]): string[]
```
- Returns matching descriptions from history
- Sorted by frequency and recency

**Amount Recommendations**:
```typescript
getAmountRecommendations(description: string, category: string, expenses: Expense[]): {
  mostCommon: number
  average: number
  range: { min: number, max: number }
}
```

**Category Prediction**:
```typescript
getCategoryRecommendation(description: string, expenses: Expense[]): string | null
```
- Uses historical data to predict category based on description

---

## UI/UX Patterns

### Responsive Design

**Breakpoints** (Tailwind default):
- **Mobile**: `< 768px` - Single column, bottom navigation
- **Tablet**: `768px - 1024px` - Two columns, bottom navigation
- **Desktop**: `> 1024px` - Sidebar navigation, multi-column layout
- **2XL**: `1400px+` - Maximum container width

**Navigation**:
- Desktop: Sidebar (left, fixed, 256px width)
- Mobile/Tablet: Bottom bar (sticky)

**Container Configuration**:
- Centered with padding: 2rem
- Max width on 2xl screens: 1400px

### Component Patterns

**Card Layout**:
```tsx
<Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**Dialog Pattern**:
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Form content */}
  </DialogContent>
</Dialog>
```

**Loading States**:
```tsx
if (isLoading) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gradient-to-r from-violet-600 to-indigo-600" />
    </div>
  )
}
```

### Data Visualization

**Charts** (Recharts):
- Line Chart: Expense trends over time
- Pie Chart: Category distribution
- Bar Chart: Weekly/monthly comparisons

**Progress Bars**:
```tsx
<Progress
  value={percentage}
  className={cn(
    percentage >= 100 && "bg-red-100 dark:bg-red-900",
    percentage >= 80 && percentage < 100 && "bg-orange-100 dark:bg-orange-900"
  )}
/>
```

---

## Testing & Quality Assurance

### Current State
- **Linting**: ESLint configured with React and TypeScript rules
  - `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser`
  - `eslint-plugin-react-hooks` for React hooks rules
  - `eslint-plugin-react-refresh` for fast refresh
- **Type Checking**: 100% TypeScript coverage with strict mode
- **Unit Tests**: Not yet implemented (recommended: Vitest)
- **E2E Tests**: Not yet implemented (recommended: Playwright)

### Testing Strategy (Recommended)

**Unit Tests** (`vitest`):
```typescript
// src/utils/__tests__/calculations.test.ts
import { describe, it, expect } from 'vitest'
import { calculateHealthScore } from '../insights'

describe('calculateHealthScore', () => {
  it('should return 100 for perfect financial health', () => {
    const result = calculateHealthScore(expenses, config, stats)
    expect(result).toBe(100)
  })
})
```

**Component Tests** (`@testing-library/react`):
```typescript
// src/pages/__tests__/Dashboard.test.tsx
import { render, screen } from '@testing-library/react'
import Dashboard from '../Dashboard'

it('renders financial health score', () => {
  render(<Dashboard />)
  expect(screen.getByText(/财务健康/i)).toBeInTheDocument()
})
```

---

## Deployment

### Build Process

```bash
npm run build
```

**Build Steps**:
1. TypeScript compilation (`tsc`)
2. Vite build process
3. Output: `dist/` directory with optimized static files

**Development Server**:
- Port: 3000
- Auto-open browser: enabled
- Hot module replacement (HMR)

### Environment Variables

Currently none required (client-side only app with IndexedDB)

### Deployment Platforms

**Vercel** (`vercel.json`):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Netlify** (`netlify.toml`):
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Both configurations handle SPA routing correctly.

---

## Common Tasks for AI Assistants

### Task 1: Adding a New Expense Category

1. No code change needed - categories are dynamic strings
2. Update constants if you want predefined list (`src/utils/constants.ts`)

### Task 2: Creating a New Page

1. Create component: `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`:
   ```typescript
   const pages = {
     // ... existing
     newPage: NewPage,
   }

   const navItems = [
     // ... existing
     { id: 'newPage', icon: IconComponent, label: 'New Page' },
   ]
   ```

### Task 3: Adding Database Migration

1. Increment version in `src/db/database.ts`:
   ```typescript
   this.version(4).stores({
     // ... all existing tables (must include all!)
     newTable: 'id, field1, field2',
   })
   ```

2. Add table type to class:
   ```typescript
   export class FinanceDatabase extends Dexie {
     // ... existing
     newTable!: Table<NewType>
   }
   ```

### Task 4: Implementing Export Feature

See `src/utils/exportData.ts` for reference:

```typescript
export function exportToCSV(data: any[], filename: string) {
  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  const csv = convertToCSV(data)

  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}
```

### Task 5: Adding Smart Insight Rule

In `src/utils/insights.ts`:

```typescript
export function generateSmartInsights(data: AnalysisData): Insight[] {
  const insights: Insight[] = []

  // Add new rule
  if (/* condition */) {
    insights.push({
      type: 'warning',
      title: 'New Insight',
      description: 'Details...',
      priority: 2,
    })
  }

  return insights.sort((a, b) => b.priority - a.priority)
}
```

---

## File Size Reference

Understanding file complexity helps prioritize refactoring:

**Large Files (500+ lines)** - Core functionality:
- `src/pages/Expenses.tsx` (1,258 lines) - Main expense management
- `src/pages/Dashboard.tsx` (715 lines) - Dashboard with health score
- `src/store/useFinanceStore.ts` (666 lines) - Zustand store
- `src/pages/Planning.tsx` (637 lines) - Budget planning

**Medium Files (200-500 lines)** - Business logic:
- `src/utils/exportData.ts` (396 lines)
- `src/utils/insights.ts` (372 lines)
- `src/pages/Investment.tsx` (374 lines)
- `src/utils/smartInput.ts` (328 lines)
- `src/utils/expenseAnalytics.ts` (288 lines)
- `src/pages/Reimbursement.tsx` (277 lines)

**Small Files (< 200 lines)** - Supporting modules:
- All UI components (< 100 lines each)
- Utility files (formatters, calculations, constants)
- Database schema and types

---

## Important Notes for AI Assistants

### 1. Data Integrity

**Always maintain bidirectional relationships**:
```typescript
// When creating expense with reimbursement
await db.expenses.add({ ...expense, reimbursementId })
await db.reimbursements.update(reimbursementId, { expenseId: expense.id })
```

**Cascade operations** when deleting:
```typescript
// Delete expense → clear reimbursement link
if (expense.reimbursementId) {
  await db.reimbursements.update(expense.reimbursementId, {
    expenseId: undefined
  })
}
await db.expenses.delete(expense.id)
```

### 2. Default Account Book Protection

The default account book (usually "日常账本") **cannot be deleted**:
```typescript
if (accountBook.isDefault) {
  throw new Error('Cannot delete default account book')
}
```

### 3. Tag and Account Book Deletion

When deleting tags or account books, either:
- **Migrate data** to another tag/book, OR
- **Remove references** from expenses

```typescript
// Migration example
const expenses = await db.expenses.where('accountBookId').equals(oldBookId).toArray()
await Promise.all(expenses.map(e =>
  db.expenses.update(e.id, { accountBookId: newBookId })
))
```

### 4. Performance Considerations

- Use `useMemo` for calculations involving >100 items
- Batch database operations when possible
- Use indexed fields for filtering (see database schema)
- Avoid re-renders by memoizing callbacks with `useCallback`

### 5. Localization

- All UI text is in Chinese (Simplified)
- Number format: `¥123,456.78` (formatCurrency in `src/utils/formatters.ts`)
- Date format: `YYYY-MM-DD` or `YYYY年MM月DD日`

### 6. Security Considerations

- All data stored locally (IndexedDB) - no backend
- No authentication/authorization needed
- Export features must handle sensitive data appropriately
- Consider adding encryption for sensitive notes/receipts in future

---

## Advanced Features (Backend Complete, UI Pending)

The following features have **100% complete backend logic** but need UI implementation:

### 1. Tag Management
- **Store Methods**: `addTag`, `updateTag`, `deleteTag`
- **Database Table**: `tags` (id, name, color, icon, count)
- **Use Case**: Organize expenses with custom tags (e.g., "工作", "个人", "紧急")

### 2. Multi-Account Books
- **Store Methods**: `addAccountBook`, `updateAccountBook`, `deleteAccountBook`, `setDefaultAccountBook`
- **Database Table**: `accountBooks` (id, name, description, icon, color, isDefault)
- **Use Case**: Separate personal vs. business expenses

### 3. Budget Management
- **Store Methods**: `addBudget`, `updateBudget`, `deleteBudget`
- **Database Table**: `budgets` (id, category, amount, period, warningThreshold)
- **Utils**: `src/utils/budgetManager.ts` (203 lines of logic)
- **Use Case**: Set spending limits per category/period

### 4. Expense Templates
- **Store Methods**: `addExpenseTemplate`, `updateExpenseTemplate`, `deleteExpenseTemplate`
- **Database Table**: `expenseTemplates` (id, name, category, amount, description)
- **Use Case**: Quick-add common expenses (e.g., "工作日午餐")

### 5. Recurring Expenses
- **Store Methods**: `addRecurringExpense`, `updateRecurringExpense`, `deleteRecurringExpense`, `executeRecurringExpense`, `checkAndExecuteRecurring`
- **Database Table**: `recurringExpenses` (id, name, frequency, dayOfWeek/Month/Year, autoCreate)
- **Use Case**: Automatic expense creation (rent, subscriptions, etc.)

### 6. Advanced Export
- **Methods**: `exportToExcel`, `exportToPDF` (in `src/utils/exportData.ts`)
- **Libraries**: xlsx (installed), jspdf (installed)
- **Use Case**: Professional reports with charts

---

## Git Workflow

### Branch Strategy

**Repository**: Not currently tracked (local development)

**Branch Naming Convention** (if using Git):
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Documentation: `docs/description`

### Commit Guidelines

**Format**:
```
<type>: <description>

<optional body>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `style`: UI/styling changes
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Build/tooling changes

**Examples from project history**:
```
feat: 完整UI重构 - 现代渐变风格 + 深色模式
feat: 完成设置页面和增强导出功能 - 完整实现选项A
docs: 添加完整的项目实施总结文档
feat: 扩展FinanceStore支持高级功能
feat: 支出模块全面优化 - 实施所有5个方案
feat: 实现完整的卡片式仪表盘方案
feat: 添加数据导出和支出编辑功能
feat: 实现支出与报销联动功能
```

### Push Strategy

Standard git workflow:
```bash
git add .
git commit -m "type: description"
git push -u origin <branch-name>
```

---

## Troubleshooting Guide

### Issue: Database version conflict

**Symptom**: `VersionError: Database opened with higher version than requested`

**Solution**:
```typescript
// Clear IndexedDB and reload
await db.delete()
await db.open()
await initializeDatabase()
```

### Issue: Type errors after adding new field

**Solution**:
1. Update interface in `src/store/types.ts`
2. Update database schema in `src/db/database.ts` (new version)
3. Update store type in `src/store/useFinanceStore.ts`
4. Run `npm run build` to check for type errors

### Issue: Dark mode not working

**Solution**:
Check that all color utilities have `dark:` variants:
```tsx
// Bad
<div className="bg-white text-black" />

// Good
<div className="bg-white dark:bg-slate-900 text-black dark:text-white" />
```

### Issue: Export file corrupted

**Solution**:
Ensure UTF-8 BOM for CSV (Excel compatibility):
```typescript
const BOM = '\uFEFF'
const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
```

---

## Resources & References

### Official Documentation
- [React 18](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Zustand](https://docs.pmnd.rs/zustand)
- [Dexie.js](https://dexie.org/)

### Project Documentation
- `README.md`: User guide (Chinese)
- `CLAUDE.md`: AI assistant guide (this file)
- `IMPLEMENTATION_SUMMARY.md`: Detailed implementation notes (Chinese)
- `CODEBASE_ANALYSIS.md`: Comprehensive technical analysis (34 KB, 1,293 lines)
- `package.json`: Dependencies and scripts

### Codebase Statistics
- **Total Lines**: ~7,684 (across 30 TypeScript/TSX files)
- **Total Size**: 1.1 MB (src: 428 KB)
- **Components**: 6 pages + 8 UI components
- **Utility Files**: 8 modules (2,117 lines total)
- **Type Definitions**: 15+
- **Store Actions**: 30+
- **Database Tables**: 9

---

## Future Enhancements (Recommendations)

1. **Testing Infrastructure**
   - Add Vitest for unit tests
   - Add Playwright for E2E tests
   - Target: 80% code coverage

2. **Performance Monitoring**
   - Add performance metrics tracking
   - Monitor IndexedDB query performance
   - Optimize large dataset handling (virtual scrolling)

3. **Data Sync**
   - Cloud backup/sync (optional)
   - Export/import full database
   - Multi-device synchronization

4. **Advanced Analytics**
   - Machine learning for spending prediction
   - Goal tracking and progress visualization
   - Custom report builder

5. **Accessibility**
   - ARIA labels for screen readers
   - Keyboard navigation improvements
   - Color contrast compliance (WCAG AA)

6. **Mobile App**
   - React Native version
   - Offline-first architecture
   - Camera integration for receipt scanning

---

## Contact & Support

**Project**: 借呗财务管理系统 (Jiebei Finance Management System)
**Status**: Production-ready
**Last Updated**: 2025-11-17
**Development**: AI-assisted with Claude Code

For issues and feature requests, refer to the project documentation or create new issues in the repository.

---

**End of CLAUDE.md**

This guide should be updated whenever significant architectural changes are made to the codebase.
