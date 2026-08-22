import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return <main className="offline-page"><section><span className="brand-mark">F</span><i><WifiOff /></i><h1>Você está sem conexão</h1><p>Por segurança, dados financeiros não são armazenados no cache do navegador. Reconecte-se para acessar as informações atualizadas.</p><Link href="/">Tentar novamente</Link></section></main>;
}
