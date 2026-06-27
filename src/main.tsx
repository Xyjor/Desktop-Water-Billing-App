import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BillingProvider } from "./context/BillingContext";
import LoginScreen from "./components/LoginScreen";
import ForcePasswordChange from "./components/ForcePasswordChange";
import { RefreshCw } from "lucide-react";

function AppShell() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <>
      {session.mustChangePassword && <ForcePasswordChange />}
      <BillingProvider>
        <App />
      </BillingProvider>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  </React.StrictMode>,
);
