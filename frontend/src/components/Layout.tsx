import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getCurrentAccount, logoutMockAccount } from "../services/mockAuth";
import { BookIcon, ChartIcon, HomeIcon } from "./portal/PortalIcons";

type Props = {
  children: ReactNode;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }
  return parts
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
}

export default function Layout({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const account = getCurrentAccount();

  function handleLogout() {
    logoutMockAccount();
    navigate("/");
  }

  function navClassName(path: string): string {
    const active = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
    return [
      "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition",
      active
        ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    ].join(" ");
  }

  return (
    <div className="portal-page">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3 text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
            <span className="hidden h-8 w-1 rounded-full bg-indigo-500 sm:block" aria-hidden="true" />
            <span>Адаптивное обучение Python</span>
          </Link>
          {account ? (
            <div className="flex items-center gap-3">
              <nav className="hidden items-center gap-1 md:flex" aria-label="Основная навигация">
                <Link to="/" className={navClassName("/")}>
                  <HomeIcon className="h-4 w-4" />
                  <span>Главная</span>
                </Link>
                <Link to="/course" className={navClassName("/course")}>
                  <BookIcon className="h-4 w-4" />
                  <span>Курс</span>
                </Link>
                <Link to="/diagnostic" className={navClassName("/diagnostic")}>
                  <ChartIcon className="h-4 w-4" />
                  <span>Диагностика</span>
                </Link>
              </nav>

              <div className="relative">
                <details className="group">
                  <summary
                    className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-800 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label="Открыть профиль"
                  >
                    {getInitials(account.name)}
                  </summary>
                  <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
                    <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                        {getInitials(account.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950">{account.name}</div>
                        <div className="truncate text-xs text-slate-500">{account.email}</div>
                      </div>
                    </div>
                    <button type="button" onClick={handleLogout} className="portal-button-secondary w-full">
                      Выйти
                    </button>
                  </div>
                </details>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
