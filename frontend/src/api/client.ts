import {
  Category,
  CreateCategoryPayload,
  CreateTransactionPayload,
  Transaction,
  UpdateTransactionPayload,
} from '../types';

const API_BASE_URL = 'http://localhost:3000';
export const CURRENT_USER_ID = 'user-1234';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Error ${response.status} en ${path}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function getCategories(): Promise<Category[]> {
  try {
    return await request<Category[]>('/categories');
  } catch (err) {
    console.warn('No se pudieron cargar categorías todavía:', err);
    return [];
  }
}

export function createCategory(payload: CreateCategoryPayload): Promise<Category> {
  return request<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify({ ...payload, userId: CURRENT_USER_ID }),
  });
}

export function getTransactions(): Promise<Transaction[]> {
  return request<Transaction[]>(
    `/transactions?userId=${encodeURIComponent(CURRENT_USER_ID)}`
  );
}

export function createTransaction(
  payload: CreateTransactionPayload
): Promise<Transaction> {
  return request<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify({ ...payload, userId: CURRENT_USER_ID }),
  });
}

export function updateTransaction(
  id: string,
  payload: UpdateTransactionPayload
): Promise<Transaction> {
  return request<Transaction>(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
