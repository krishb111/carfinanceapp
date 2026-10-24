import { config } from "../config.js";

const BASE = "https://api.nessieisreal.com";

async function nessie<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}?key=${config.nessieKey}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Nessie ${method} ${path} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  // POSTs wrap the created object as { code, message, objectCreated }
  return (data.objectCreated ?? data) as T;
}

export type NessieAccount = { _id: string; type: string; nickname: string; balance: number; customer_id: string };
export type NessiePurchase = { _id: string; merchant_id: string; amount: number; purchase_date: string; description: string };
export type NessieDeposit = { _id: string; amount: number; transaction_date: string; description: string };
export type NessieMerchant = { _id: string; name: string; category: string[] | string };

const address = { street_number: "100", street_name: "Main St", city: "Dallas", state: "TX", zip: "75201" };

export const createCustomer = (first: string, last: string) =>
  nessie<{ _id: string }>("POST", "/customers", { first_name: first, last_name: last, address });

export const createAccount = (customerId: string, type: "Checking" | "Savings", nickname: string, balance: number) =>
  nessie<NessieAccount>("POST", `/customers/${customerId}/accounts`, { type, nickname, rewards: 0, balance });

export const createMerchant = (name: string, category: string) =>
  nessie<NessieMerchant>("POST", "/merchants", { name, category, address, geocode: { lat: 32.78, lng: -96.8 } });

export const createDeposit = (accountId: string, amount: number, date: string, description: string) =>
  nessie("POST", `/accounts/${accountId}/deposits`, {
    medium: "balance", transaction_date: date, status: "completed", amount, description,
  });

export const createPurchase = (accountId: string, merchantId: string, amount: number, date: string, description: string) =>
  nessie("POST", `/accounts/${accountId}/purchases`, {
    merchant_id: merchantId, medium: "balance", purchase_date: date, status: "completed", amount, description,
  });

export const getAccounts = (customerId: string) => nessie<NessieAccount[]>("GET", `/customers/${customerId}/accounts`);
export const getPurchases = (accountId: string) => nessie<NessiePurchase[]>("GET", `/accounts/${accountId}/purchases`);
export const getDeposits = (accountId: string) => nessie<NessieDeposit[]>("GET", `/accounts/${accountId}/deposits`);
export const getMerchant = (merchantId: string) => nessie<NessieMerchant>("GET", `/merchants/${merchantId}`);
