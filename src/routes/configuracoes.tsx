import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/site/shell";
import { maskEmail, maskPhone, ROLE_LABEL } from "@/lib/accounts";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da conta · BeacHub" },
      {
        name: "description",
        content: "Gerencie seus dados, privacidade, notificações e sessão na plataforma BeacHub.",
      },
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
        <PageHeader
          eyebrow="Conta"
          title="Configurações"
          description="Seus dados de contato nunca aparecem no perfil público."
        />

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
          <InstallAppBox />
          <Box title="Sessão">
            <p className="text-sm text-muted-foreground">
              Encerrar a sessão limpa os dados exibidos na interface.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/meus-feedbacks"
                className="border border-border px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest"
              >
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

/**
 * `beforeinstallprompt` não existe nas libs padrão do TS/DOM — só Chromium
 * dispara esse evento (Android/desktop). Safari/iOS nunca dispara, daí o
 * fallback manual de instruções ser obrigatório, não só decorativo.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    // Safari iOS não suporta a media query acima; expõe isto em vez disso.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function InstallAppBox() {
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [installed, setInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandaloneDisplay());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <Box title="Instalar o app">
        <p className="text-sm text-muted-foreground">
          Você já está usando o BeacHub instalado na tela de início. 🎉
        </p>
      </Box>
    );
  }

  return (
    <Box title="Instalar o app">
      <p className="text-sm text-muted-foreground">
        Adicione o BeacHub à tela de início do seu celular para abrir como um app, em tela cheia,
        sem a barra de endereço do navegador.
      </p>

      {installPrompt ? (
        <button
          type="button"
          onClick={() => {
            void installPrompt.prompt();
            void installPrompt.userChoice.then(() => setInstallPrompt(null));
          }}
          className="mt-3 inline-flex h-10 items-center bg-accent px-5 font-display text-[11px] font-bold uppercase tracking-widest text-accent-foreground"
        >
          Instalar agora
        </button>
      ) : platform === "ios" ? (
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
          <li>
            Toque no ícone de <strong>Compartilhar</strong> (o quadrado com a seta pra cima) na
            barra do Safari.
          </li>
          <li>
            Role a lista de opções e toque em <strong>Adicionar à Tela de Início</strong>.
          </li>
          <li>
            Confirme tocando em <strong>Adicionar</strong>, no canto superior direito.
          </li>
        </ol>
      ) : platform === "android" ? (
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
          <li>Toque no menu (os três pontinhos) no canto superior direito do navegador.</li>
          <li>
            Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
          </li>
          <li>Confirme tocando em Instalar.</li>
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Abra este link pelo navegador do seu celular (Safari no iPhone, Chrome no Android) para
          ver o passo a passo de instalação.
        </p>
      )}
    </Box>
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
