import type { User } from "./api";
import { getCurrentAccount, syncStoredUser } from "./mockAuth";

export function getStoredUser(): User | null {
  const account = getCurrentAccount();
  if (!account) {
    return null;
  }

  return {
    id: account.backendUserId,
    name: account.name,
    intro_completed: account.introCompleted,
    diagnostic_completed: account.diagnosticCompleted
  };
}

export function saveStoredUser(user: User): void {
  syncStoredUser(user);
}
