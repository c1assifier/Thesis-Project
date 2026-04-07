import { useSyncExternalStore } from "react";

import { loginAuth, registerAuth, type User } from "./api";

export interface MockAccount {
  id: string;
  name: string;
  email: string;
  backendLoginName: string;
  password: string;
  backendUserId: number;
  introCompleted: boolean;
  diagnosticCompleted: boolean;
  createdAt: string;
}

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

const ACCOUNTS_KEY = "mock_auth_accounts";
const SESSION_KEY = "mock_auth_session";
const AUTH_STATE_EVENT = "mock-auth-state-change";

function emitAuthStateChange(): void {
  window.dispatchEvent(new Event(AUTH_STATE_EVENT));
}

function readAccounts(): MockAccount[] {
  const raw = window.localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MockAccount[]) : [];
  } catch {
    window.localStorage.removeItem(ACCOUNTS_KEY);
    return [];
  }
}

function writeAccounts(accounts: MockAccount[]): void {
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  emitAuthStateChange();
}

function readSessionAccountId(): string | null {
  return window.localStorage.getItem(SESSION_KEY);
}

function writeSessionAccountId(accountId: string | null): void {
  if (accountId) {
    window.localStorage.setItem(SESSION_KEY, accountId);
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
  emitAuthStateChange();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}`;
}

function replaceAccount(nextAccount: MockAccount): MockAccount {
  const accounts = readAccounts();
  writeAccounts(accounts.map((account) => (account.id === nextAccount.id ? nextAccount : account)));
  return nextAccount;
}

export function getCurrentAccount(): MockAccount | null {
  const accountId = readSessionAccountId();
  if (!accountId) {
    return null;
  }
  return readAccounts().find((account) => account.id === accountId) ?? null;
}

export function subscribeCurrentAccount(listener: () => void): () => void {
  window.addEventListener(AUTH_STATE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(AUTH_STATE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useCurrentAccount(): MockAccount | null {
  return useSyncExternalStore(subscribeCurrentAccount, getCurrentAccount, () => null);
}

export async function registerMockAccount(input: RegisterInput): Promise<MockAccount> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password.trim();
  const accountId = makeId();

  if (!name || !email || !password) {
    throw new Error("Заполните имя, email и пароль.");
  }

  const accounts = readAccounts();
  if (accounts.some((account) => account.email === email)) {
    throw new Error("Пользователь с таким email уже зарегистрирован локально.");
  }

  const backendLoginName = email;
  const backendUser = await registerAuth(backendLoginName, password);
  const account: MockAccount = {
    id: accountId,
    name,
    email,
    backendLoginName,
    password,
    backendUserId: backendUser.id,
    introCompleted: false,
    diagnosticCompleted: false,
    createdAt: new Date().toISOString()
  };

  writeAccounts([...accounts, account]);
  writeSessionAccountId(account.id);
  return account;
}

export async function loginMockAccount(input: LoginInput): Promise<MockAccount> {
  const email = normalizeEmail(input.email);
  const password = input.password.trim();
  if (!email || !password) {
    throw new Error("Введите email и пароль.");
  }
  const accounts = readAccounts();
  const account = accounts.find((item) => item.email === email);
  const backendLoginName = account?.backendLoginName ?? email;
  let backendUser: { id: number; name: string };
  try {
    backendUser = await loginAuth(backendLoginName, password);
  } catch (error) {
    if (account && account.password === password) {
      writeSessionAccountId(account.id);
      return account;
    }
    throw error;
  }

  const nextAccount: MockAccount =
    account ??
    ({
      id: makeId(),
      name: backendUser.name,
      email,
      backendLoginName,
      password,
      backendUserId: backendUser.id,
      introCompleted: false,
      diagnosticCompleted: false,
      createdAt: new Date().toISOString()
    } satisfies MockAccount);

  const updatedAccount: MockAccount = {
    ...nextAccount,
    password,
    backendUserId: backendUser.id
  };

  if (account) {
    writeAccounts(accounts.map((item) => (item.id === account.id ? updatedAccount : item)));
  } else {
    writeAccounts([...accounts, updatedAccount]);
  }

  writeSessionAccountId(updatedAccount.id);
  return updatedAccount;
}

export function logoutMockAccount(): void {
  writeSessionAccountId(null);
}

export function syncStoredUser(user: User): MockAccount | null {
  const currentAccount = getCurrentAccount();
  if (!currentAccount) {
    return null;
  }

  return replaceAccount({
    ...currentAccount,
    backendUserId: user.id,
    introCompleted: user.intro_completed,
    diagnosticCompleted: user.diagnostic_completed
  });
}
