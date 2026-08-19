import {
  Category,
  CreateCategoryPayload,
  CreateTransactionPayload,
  FinancialInsights,
  FinancialSimulation,
  StatementImport,
  Transaction,
  UpdateTransactionPayload,
} from "../types";
import { supabase } from "../lib/supabase";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken)
    throw new Error("Tu sesión terminó. Inicia sesión nuevamente.");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      await supabase.auth.signOut({ scope: "local" });
      throw new Error(
        "Tu sesión ya no es válida. Inicia sesión nuevamente.",
      );
    }
    throw new Error(`Error ${response.status} en ${path}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export function importStatementCsv(payload: {
  sourceName: string;
  fileName: string;
  csv: string;
}): Promise<StatementImport> {
  return request<StatementImport>("/statement-imports/csv", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getFinancialInsights(
  periodDays = 30,
): Promise<FinancialInsights> {
  return request<FinancialInsights>(
    `/insights/summary?periodDays=${periodDays}`,
  );
}

export function simulateFinancialScenario(payload: {
  amount: number;
  direction: "EXPENSE" | "INCOME";
  frequency: "ONE_TIME" | "MONTHLY";
}): Promise<FinancialSimulation> {
  return request<FinancialSimulation>("/simulator", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}

export function createCategory(
  payload: CreateCategoryPayload,
): Promise<Category> {
  return request<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTransactions(): Promise<Transaction[]> {
  return request<Transaction[]>("/transactions");
}

export function createTransaction(
  payload: CreateTransactionPayload,
): Promise<Transaction> {
  return request<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTransaction(
  id: string,
  payload: UpdateTransactionPayload,
): Promise<Transaction> {
  return request<Transaction>(`/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
