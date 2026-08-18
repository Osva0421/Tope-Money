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
  date: string;
}

export interface CreateTransactionPayload {
  amount: number;
  merchant: string;
  description?: string;
  categoryId: string | null;
  type: TransactionType;
  isPlanned: boolean;
}

export interface UpdateTransactionPayload {
  amount?: number;
  merchant?: string;
  description?: string;
  categoryId?: string;
  isPlanned?: boolean;
}

export interface CreateCategoryPayload {
  name: string;
  type: string;
  nature: string;
  icon?: string;
  parentId?: string;
}
