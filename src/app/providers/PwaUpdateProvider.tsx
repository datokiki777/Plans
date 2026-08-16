import { useEffect, type ReactNode } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Dialog } from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";

/**
 * Mirrors V1's proven update-prompt UX (js/app.js `showUpdateDialog`):
 * a new service worker is never activated silently. The user is asked, and
 * only `updateServiceWorker(true)` (which reloads the page once the new SW
 * takes control) can apply it. This never clears or touches IndexedDB -
 * IndexedDB is a browser-storage API entirely separate from the service
 * worker cache; nothing in this flow calls indexedDB.deleteDatabase or
 * similar. See ARCHITECTURE.md §7/§10.
 */
export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;

      // Check right away (don't wait up to an hour for the first check),
      // plus every time the app regains focus/visibility - this is the
      // moment a PWA is most often "reopened" after being closed/backgrounded,
      // and periodically as a fallback.
      void registration.update();
      const checkNow = () => void registration.update();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkNow();
      });
      window.addEventListener("focus", checkNow);
      window.setInterval(checkNow, 60 * 60 * 1000);
    }
  });

  useEffect(() => {
    // no-op effect kept for future analytics/logging hook point
  }, [needRefresh]);

  return (
    <>
      {children}
      <Dialog
        open={needRefresh}
        onClose={() => setNeedRefresh(false)}
        title="ახალი ვერსია მზადაა"
        footer={
          <>
            <Button onClick={() => setNeedRefresh(false)}>არა</Button>
            <Button variant="primary" onClick={() => updateServiceWorker(true)}>
              დიახ, განახლება
            </Button>
          </>
        }
      >
        <p>გსურთ ახლავე განახლება? ბოლო ცვლილებები ჩაიტვირთება.</p>
      </Dialog>
    </>
  );
}
