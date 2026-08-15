export interface Category {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  userId: string;
  parentId: string | null;
}

export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  description?: string;
  categoryId: string | null;
  type: TransactionType;
  isPlanned: boolean;
  userId: string;
  createdAt: string;
}

export interface CreateTransactionPayload {
  amount: number;
  merchant: string;
  description?: string;
  categoryId: string | null;
  type: TransactionType;
  isPlanned: boolean;
}
