import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/site/shell";
import { accounts, DEMO_PASSWORD, ROLE_LABEL } from "@/lib/accounts";
import { ApiError } from "@/lib/api/client";
import { homeForRole, useSession } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · BeacHub" },
      {
        name: "description",
        content:
          "Acesse sua conta BeacHub para participar de campeonatos, ver ranking e organizar eventos de vôlei de areia.",
      },
      { property: "og:title", content: "Entrar · BeacHub" },
      { property: "og:description", content: "Login da plataforma de vôlei de areia." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /**
   * Login real contra a API (ADR 0005). O destino depois de entrar é decidido
   * pelos papéis que vieram do **servidor** — nunca por escolha do cliente.
   */
  async function enter(emailToUse: string, passwordToUse: string) {
    setError(null);
    setPending(true);

    try {
      const account = await signIn(emailToUse, passwordToUse);

      navigate({
        to: account.roles.length > 1 ? "/escolher-perfil" : homeForRole(account.roles[0] ?? null),
      });
    } catch (e) {
      // A mensagem exibida é a que o backend mandou (CLAUDE.md §15): é ele
      // quem sabe se foi credencial inválida, conta suspensa ou excesso de
      // tentativas — e a tela não deve adivinhar.
      setError(
        e instanceof ApiError
          ? e.message
          : "Não foi possível entrar. Tente novamente em instantes.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Acesso</p>
          <h1 className="mt-1 text-4xl">Entrar no BeacHub</h1>
          <p className="mt-2 text-muted-foreground">
            Sua reputação, seu ranking e seus campeonatos em um só lugar.
          </p>

          <form
            className="mt-8 space-y-4 border border-border bg-card p-6"
            onSubmit={(e) => {
              e.preventDefault();
              void enter(email, password);
            }}
          >
            <Field label="E-mail">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="input-base"
                aria-invalid={error !== null}
              />
            </Field>
            <Field label="Senha">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pr-10"
                  aria-invalid={error !== null}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="h-11 w-full bg-accent font-display text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
            >
              {pending ? "Entrando…" : "Entrar"}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                Esqueci minha senha
              </button>
              <Link
                to="/cadastro"
                className="font-semibold text-accent underline-offset-4 hover:underline"
              >
                Criar minha conta
              </Link>
            </div>
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              Login social (Google / Apple) será habilitado em uma próxima fase.
            </p>
          </form>
        </div>

        <div className="border border-border bg-card p-6">
          <p className="eyebrow">Modo demonstração</p>
          <h2 className="mt-1 text-2xl">Contas de teste</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada conta abre uma experiência diferente: permissões, menus e telas mudam conforme o
            papel.
          </p>
          <div className="mt-5 divide-y divide-border border border-border">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={pending}
                onClick={() => void enter(a.email, DEMO_PASSWORD)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
              >
                <span className="flex h-8 w-8 items-center justify-center bg-graphite text-[11px] font-bold text-background">
                  {a.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-bold">
                    {a.label} · {a.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {a.roles.map((r) => ROLE_LABEL[r]).join(" + ")} · {a.city}/{a.state}
                  </span>
                </span>
                <span className="font-display text-[10px] font-bold uppercase tracking-widest text-accent">
                  Entrar
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
