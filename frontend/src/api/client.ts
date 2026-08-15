import { Category, CreateTransactionPayload, Transaction } from '../types';

// IMPORTANTE:
// - En el simulador de iOS, "localhost" sí resuelve a tu Mac.
// - En un iPhone físico, cambia esto por la IP local de tu Mac (`ipconfig getifaddr en0`).
const API_BASE_URL = 'http://localhost:3000';

// Usuario semilla creado en Prisma Studio. Cuando exista login real,
// esto se reemplaza por el id del usuario autenticado.
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
    // Si el backend todavía no tiene /categories, no tumbamos la pantalla.
    console.warn('No se pudieron cargar categorías todavía:', err);
    return [];
  }
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
