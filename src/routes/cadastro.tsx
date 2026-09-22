import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/site/shell";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta · BeacHub" },
      { name: "description", content: "Crie sua conta gratuita no BeacHub e comece a jogar campeonatos de vôlei de areia com ranking e reputação." },
      { property: "og:title", content: "Criar conta · BeacHub" },
      { property: "og:description", content: "Cadastro rápido: nome, e-mail, telefone e senha." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  /*
   * Mínimo de 8 caracteres, e não os 6 do protótipo: a política real está no
   * backend (docs/DIVERGENCES.md §14b.1) e o formulário precisa concordar com
   * ela — senão a pessoa preenche, envia e leva 422 sem entender.
   */
  const canSubmit = terms && privacy && password.length >= 8 && !mismatch && !pending;

  async function submit() {
    setError(null);
    setFieldErrors({});
    setPending(true);

    try {
      await signUp({
        name,
        email,
        phone: phone.trim() === "" ? undefined : phone,
        password,
        password_confirmation: confirm,
        accept_terms: terms,
        accept_privacy: privacy,
      });

      navigate({ to: "/onboarding" });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFieldErrors(e.fieldErrors);
      } else {
        setError("Não foi possível criar sua conta. Tente novamente em instantes.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-12">
        <p className="eyebrow">Comece agora</p>
        <h1 className="mt-1 text-4xl">Criar minha conta</h1>
        <p className="mt-2 text-muted-foreground">Leva menos de um minuto. Não pedimos CPF.</p>

        <form
          className="mt-8 space-y-4 border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            void submit();
          }}
        >
          <label className="flex items-center gap-4 border border-dashed border-border p-4">
            <span className="flex h-14 w-14 items-center justify-center bg-graphite font-display text-sm font-bold text-background">
              +
            </span>
            <span>
              <span className="block font-display text-sm font-bold">Avatar</span>
              <span className="block text-xs text-muted-foreground">Opcional · JPG ou PNG até 2 MB</span>
            </span>
            <input type="file" accept="image/*" className="hidden" />
          </label>

          <L label="Nome">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base"
              placeholder="Seu nome"
            />
          </L>
          {fieldErrors['name'] ? <p className="text-sm text-destructive">{fieldErrors['name']}</p> : null}
          <L label="E-mail">
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              placeholder="voce@email.com"
            />
          </L>
          {fieldErrors['email'] ? <p className="text-sm text-destructive">{fieldErrors['email']}</p> : null}
          <L label="Telefone">
            <input
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-base"
              placeholder="(00) 00000-0000"
            />
          </L>
          {fieldErrors['phone'] ? <p className="text-sm text-destructive">{fieldErrors['phone']}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <L label="Senha">
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="input-base"
                placeholder="mínimo 8 caracteres"
              />
            </L>
            <L label="Confirmar senha">
              <input
                required
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input-base"
                placeholder="repita a senha"
              />
            </L>
          </div>
          {mismatch ? <p className="text-sm text-destructive">As senhas não conferem.</p> : null}
          {fieldErrors['password'] ? <p className="text-sm text-destructive">{fieldErrors['password']}</p> : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="space-y-2 border-t border-border pt-4 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
              <span>Aceito os Termos de Uso</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1" />
              <span>Li e aceito a Política de Privacidade</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-11 w-full bg-accent font-display text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-40"
          >
            {pending ? "Criando conta…" : "Criar conta"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-semibold text-accent underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </AppShell>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
