"use client";

import { Download, RefreshCw, Share, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [iosHelp, setIosHelp] = useState(false);
  const [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null);
  const [online, setOnline] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => { setOnline(navigator.onLine); setDismissed(sessionStorage.getItem("pwa-install-dismissed") === "1"); }, 0);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); if (sessionStorage.getItem("pwa-install-dismissed") !== "1") setDismissed(false); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);

    let iosTimer: number | undefined;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios && !isStandalone() && sessionStorage.getItem("pwa-install-dismissed") !== "1") {
      iosTimer = window.setTimeout(() => { setIosHelp(true); setDismissed(false); }, 1200);
    }

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        if (registration.waiting) setUpdateReady(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => { if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(worker); });
        });
      }).catch(() => undefined);
    }
    return () => { window.clearTimeout(initialTimer); if (iosTimer) window.clearTimeout(iosTimer); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); window.removeEventListener("beforeinstallprompt", onInstall); };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const reload = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", reload);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", reload);
  }, []);

  const closeInstall = () => { sessionStorage.setItem("pwa-install-dismissed", "1"); setDismissed(true); setIosHelp(false); };
  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    closeInstall();
  };
  const update = () => updateReady?.postMessage({ type: "SKIP_WAITING" });

  return <>
    {!online && <div className="pwa-connectivity" role="status"><WifiOff size={15} /> Sem conexão — seus dados não serão alterados</div>}
    {updateReady && <aside className="pwa-toast" aria-live="polite"><span className="pwa-toast-icon"><RefreshCw /></span><div><strong>Atualização disponível</strong><small>Atualize para usar a versão mais recente.</small></div><button className="pwa-action" onClick={update}>Atualizar</button></aside>}
    {!dismissed && !updateReady && (installPrompt || iosHelp) && <aside className="pwa-install" aria-label="Instalar aplicativo"><button className="pwa-dismiss" onClick={closeInstall} aria-label="Fechar"><X /></button><span className="pwa-install-icon">F</span><div><strong>Instale o Finança Familiar</strong><small>{iosHelp ? "No iPhone ou iPad, toque em Compartilhar e depois em Adicionar à Tela de Início." : "Acesse rapidamente pela tela inicial, com aparência de aplicativo."}</small></div>{iosHelp ? <span className="pwa-ios-hint"><Share /> Compartilhar</span> : <button className="pwa-action" onClick={() => void install()}><Download /> Instalar</button>}</aside>}
  </>;
}
