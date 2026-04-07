import type { FormEvent } from "react";
import { useState } from "react";

import { loginMockAccount, registerMockAccount } from "../../services/mockAuth";
import { GraduationCapIcon, LockIcon, MailIcon } from "./PortalIcons";
import { PortalPanel, PortalWireframe } from "./PortalPrimitives";

export default function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const account =
        mode === "login"
          ? await loginMockAccount({ email, password })
          : await registerMockAccount({ name, email, password });
      setError("");
      window.location.replace(account.diagnosticCompleted ? "/" : "/diagnostic");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось выполнить вход.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PortalPanel className="mx-auto max-w-xl p-6">
      <PortalWireframe className="p-8">
        <form className="mx-auto max-w-sm space-y-6" onSubmit={handleSubmit}>
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gray-200 text-gray-500">
              <GraduationCapIcon className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Система обучения Python</h1>
          </div>

          {mode === "register" ? (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                <span className="inline-flex h-4 w-4 rounded-full bg-gray-300" />
                <span>Имя студента</span>
              </div>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Иван Петров" className="portal-input" />
            </div>
          ) : null}

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
              <MailIcon className="h-4 w-4 text-gray-400" />
              <span>Email</span>
            </div>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@university.edu"
              className="portal-input"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
              <LockIcon className="h-4 w-4 text-gray-400" />
              <span>Пароль</span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="portal-input"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="portal-button-primary w-full">
            {isSubmitting ? "Подождите..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>

          <div className="text-center">
            <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-sm text-blue-600 hover:underline">
              {mode === "login" ? "Зарегистрироваться" : "У меня уже есть аккаунт"}
            </button>
          </div>

          {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}
        </form>
      </PortalWireframe>
    </PortalPanel>
  );
}
