import { useQuery } from "@tanstack/react-query";

import AuthForm from "../components/portal/AuthForm";
import DashboardView from "../components/portal/DashboardView";
import DiagnosticGateView from "../components/portal/DiagnosticGateView";
import { useCurrentAccount } from "../services/mockAuth";
import { getPortalBootstrap } from "../services/portalApi";
import { getStoredUser } from "../services/userSession";

export default function HomePage() {
  const account = useCurrentAccount();
  const user = getStoredUser();

  const bootstrapQuery = useQuery({
    queryKey: ["portal-bootstrap", user?.id],
    queryFn: () => getPortalBootstrap(user!.id),
    enabled: account !== null && user !== null,
  });

  if (!account) {
    return <AuthForm />;
  }

  if (bootstrapQuery.isError) {
    return <div className="portal-panel p-6 text-sm text-red-600">Не удалось загрузить стартовые данные интерфейса.</div>;
  }

  if (bootstrapQuery.isLoading || !bootstrapQuery.data) {
    return <div className="portal-panel p-6 text-sm text-gray-600">Загрузка макета системы...</div>;
  }

  if (!account.diagnosticCompleted) {
    return <DiagnosticGateView bootstrap={bootstrapQuery.data} />;
  }

  return <DashboardView account={account} bootstrap={bootstrapQuery.data} />;
}
