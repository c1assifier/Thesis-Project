import { useState } from "react";

import { getReadableError, registerUser, type User } from "../services/api";
import { saveStoredUser } from "../services/userSession";

type Props = {
  onRegistered: (user: User) => void;
};

export default function UserRegistration({ onRegistered }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim()) {
      setError("Введите имя студента.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const user = await registerUser(name.trim());
      saveStoredUser(user);
      onRegistered(user);
    } catch (registrationError) {
      setError(getReadableError(registrationError, "Не удалось зарегистрировать студента."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="edu-panel p-5">
      <h2 className="edu-section-title">Регистрация студента</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Введите имя обучающегося, чтобы открыть персональный прогресс и отправлять решения.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-primary"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Имя студента"
        />
        <button
          className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Создание..." : "Зарегистрировать"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
