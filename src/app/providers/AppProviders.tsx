import type { ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { ErrorBoundary } from "./ErrorBoundary";
import { ConfirmProvider } from "@/shared/ui/ConfirmDialog";
import { ToastProvider } from "@/shared/ui/Toast";
import { PwaUpdateProvider } from "./PwaUpdateProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  const isNative = Capacitor.isNativePlatform();
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>{isNative ? children : <PwaUpdateProvider>{children}</PwaUpdateProvider>}</ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
