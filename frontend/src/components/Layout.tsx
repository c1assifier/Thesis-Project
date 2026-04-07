import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getCurrentAccount, logoutMockAccount } from "../services/mockAuth";
import { BookIcon, ChartIcon, HomeIcon } from "./portal/PortalIcons";

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const account = getCurrentAccount();

  function handleLogout() {
    logoutMockAccount();
    navigate("/");
  }

  function linkClassName(path: string): string {
    const active = location.pathname === path || location.pathname.startsWith(`${path}/`);
    return active ? "text-gray-900" : "text-gray-600 hover:text-gray-900";
  }

  return (
    <div className="portal-page">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-4 text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">
            <span>Адаптивное обучение Python</span>
          </Link>
          {account ? (
            <>
              <div className="hidden items-center gap-6 text-sm lg:flex">
                <Link to="/" className={`flex items-center gap-2 ${linkClassName("/")}`}>
                  <HomeIcon className="h-4 w-4" />
                  <span>Главная</span>
                </Link>
                <Link to="/course" className={`flex items-center gap-2 ${linkClassName("/course")}`}>
                  <BookIcon className="h-4 w-4" />
                  <span>Курс</span>
                </Link>
                <Link to="/diagnostic" className={`flex items-center gap-2 ${linkClassName("/diagnostic")}`}>
                  <ChartIcon className="h-4 w-4" />
                  <span>Диагностика</span>
                </Link>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-semibold text-gray-700">
                  {account.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="hidden text-right md:block">
                  <div className="text-sm text-gray-700">{account.name}</div>
                  <div className="text-xs text-gray-500">{account.email}</div>
                </div>
                <button type="button" onClick={handleLogout} className="portal-button-secondary px-3 py-2 text-xs">
                  Выйти
                </button>
              </div>
            </>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
