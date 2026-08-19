export interface Category {
  id: string;
  name: string;
  type: string;
  nature: string;
  icon: string | null;
  userId: string;
  parentId: string | null;
  keywords?: string[];
}

export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  description?: string;
  categoryId: string | null;
  type: TransactionType;
  isPlanned: boolean;
  userId: string;
  date: string;
}

export interface CreateTransactionPayload {
  amount: number;
  merchant: string;
  description?: string;
  categoryId: string | null;
  type: TransactionType;
  isPlanned: boolean;
  date?: string;
}

export interface UpdateTransactionPayload {
  amount?: number;
  merchant?: string;
  description?: string;
  categoryId?: string;
  isPlanned?: boolean;
  creditCardId?: string | null;
  date?: string;
}

export interface CreateCategoryPayload {
  name: string;
  type: string;
  nature: string;
  icon?: string;
  parentId?: string;
}

export type StatementEntryStatus =
  "CREATED" | "MATCHED" | "DUPLICATE" | "ERROR";

export interface StatementImportEntry {
  id: string;
  rowNumber: number;
  status: StatementEntryStatus;
  merchant: string | null;
  amount: number | null;
  type: TransactionType | null;
  errorMessage: string | null;
}

export interface StatementImport {
  id: string;
  sourceName: string;
  fileName: string | null;
  status: "PROCESSING" | "COMPLETED" | "COMPLETED_WITH_ERRORS";
  rowCount: number;
  createdCount: number;
  matchedCount: number;
  duplicateCount: number;
  errorCount: number;
  createdAt: string;
  entries: StatementImportEntry[];
}

export interface FinancialInsights {
  period: { days: number; start: string; end: string };
  totals: {
    income: number;
    expenses: number;
    netCashFlow: number;
    savingsRatePercent: number | null;
    expenseTrendPercent: number | null;
  };
  planning: { plannedExpenses: number; unplannedExpenses: number };
  categories: Array<{
    categoryId: string | null;
    name: string;
    icon: string | null;
    total: number;
    percentage: number;
  }>;
  smallRecurringExpenses: Array<{
    merchant: string;
    category: string;
    count: number;
    total: number;
    average: number;
    percentageOfExpenses: number;
  }>;
  messages: string[];
  dataQuality: {
    transactionCount: number;
    uncategorizedCount: number;
    hasPreviousPeriod: boolean;
  };
}

export interface FinancialSimulation {
  baseline: {
    trackedBalance: number;
    averageMonthlyIncome: number;
    averageMonthlyExpenses: number;
    monthlyFreeCash: number;
  };
  result: {
    trackedBalance: number;
    monthlyFreeCash: number;
    riskLevel: "SAFE" | "CAUTION" | "RISK";
    warnings: string[];
  };
  assumptions: string[];
}
