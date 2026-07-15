// Finanças a Dois lets people sign in with just a name + password (no e-mail).
// Supabase Auth still requires an e-mail-shaped identifier internally, so we
// derive a stable synthetic address from the normalized name and use that
// behind the scenes. The user never sees or types it.

const AUTH_EMAIL_DOMAIN = "contas.financasadois.internal";

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

export function nameToAuthEmail(name: string) {
  const slug = slugify(name) || "usuario";
  return `${slug}@${AUTH_EMAIL_DOMAIN}`;
}

export function translateAuthError(message: string) {
  const map: Record<string, string> = {
    "Invalid login credentials": "Nome ou senha incorretos.",
    "User already registered": "Esse nome já está em uso. Escolha outro ou entre na conta existente.",
    "Email not confirmed":
      "Essa conta ainda não pode entrar porque a confirmação de e-mail está ativada no Supabase. Peça para quem administra o projeto desativar \"Confirm email\" em Authentication > Sign In / Up > Email.",
    "Password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres.",
  };
  return map[message] ?? message;
}
