import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { AppShell, PageHeader } from "@/components/site/shell";
import { maskEmail, maskPhone, ROLE_LABEL } from "@/lib/accounts";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da conta · BeacHub" },
      { name: "description", content: "Gerencie seus dados, privacidade, notificações e sessão na plataforma BeacHub." },
      { property: "og:title", content: "Configurações da conta · BeacHub" },
      { property: "og:description", content: "Dados pessoais, privacidade e sessão." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { account, activeRole, signOut } = useSession();
  const navigate = useNavigate();

  if (!account) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-3xl">Você não está conectado</h1>
          <Link
            to="/login"
            className="mt-6 inline-flex h-11 items-center bg-accent px-6 font-display text-xs font-bold uppercase tracking-widest text-accent-foreground"
          >
            Entrar
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader eyebrow="Conta" title="Configurações" description="Seus dados de contato nunca aparecem no perfil público." />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Box title="Dados da conta">
            <Row label="Nome" value={account.name} />
            <Row label="E-mail" value={account.email} />
            <Row label="Telefone" value={account.phone} />
            <Row label="Cidade" value={`${account.city}/${account.state}`} />
            <Row label="Papéis" value={account.roles.map((r) => ROLE_LABEL[r]).join(" + ")} />
            <Row label="Experiência ativa" value={activeRole ? ROLE_LABEL[activeRole] : "—"} />
          </Box>
          <Box title="Perfil público">
            <p className="text-sm text-muted-foreground">
              O que outras pessoas veem: nome, avatar, cidade, ranking, reputação e histórico.
            </p>
            <Row label="E-mail exibido" value={`${maskEmail(account.email)} · oculto`} />
            <Row label="Telefone exibido" value={`${maskPhone(account.phone)} · oculto`} />
          </Box>
          <Box title="Notificações">
            <Toggle label="Partidas e chamadas de quadra" on />
            <Toggle label="Convites de dupla" on />
            <Toggle label="Feedback de evento" on />
            <Toggle label="Novidades e publicidade" />
          </Box>
          <Box title="Sessão">
            <p className="text-sm text-muted-foreground">Encerrar a sessão limpa os dados exibidos na interface.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/meus-feedbacks" className="border border-border px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest">
                Meus feedbacks
              </Link>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  navigate({ to: "/login" });
                }}
                className="bg-graphite px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest text-background"
              >
                Sair da conta
              </button>
            </div>
          </Box>
        </div>
      </div>
    </AppShell>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-card p-5">
      <h2 className="text-lg">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Toggle({ label, on = false }: { label: string; on?: boolean }) {
  return (
    <label className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
      <span>{label}</span>
      <input type="checkbox" defaultChecked={on} />
    </label>
  );
}
