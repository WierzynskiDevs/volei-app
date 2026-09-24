import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wallet,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { accounts, DEMO_PASSWORD, ROLE_LABEL } from "@/lib/accounts";
import { homeForRole, useSession } from "@/lib/session";

export function UserMenu() {
  const { account, activeRole, signOut, signIn, setActiveRole } = useSession();
  const navigate = useNavigate();

  if (!account) {
    return (
      <Link
        to="/login"
        className="flex h-9 items-center bg-graphite px-4 font-display text-xs font-bold uppercase tracking-widest text-background"
      >
        Entrar
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-9 items-center gap-2 border border-border bg-card px-2 text-sm font-semibold md:px-3">
        <span className="flex h-5 w-5 items-center justify-center bg-graphite text-[10px] font-bold text-background">
          {account.initials}
        </span>
        <span className="hidden md:inline">{account.name.split(" ")[0]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-none border-border">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="font-display text-sm font-bold">{account.name}</p>
          <p className="text-xs font-normal text-muted-foreground">
            {account.label} · {activeRole ? ROLE_LABEL[activeRole] : ""}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {account.playerId ? (
          <DropdownMenuItem asChild>
            <Link to="/jogadores/$playerId" params={{ playerId: account.playerId }}>
              <User className="mr-2 h-4 w-4" /> Meu perfil
            </Link>
          </DropdownMenuItem>
        ) : null}
        {account.roles.includes("PLAYER") ? (
          <DropdownMenuItem asChild>
            <Link to="/minhas-inscricoes">
              <Receipt className="mr-2 h-4 w-4" /> Minhas inscrições
            </Link>
          </DropdownMenuItem>
        ) : null}
        {account.roles.includes("ORGANIZER") ? (
          <DropdownMenuItem asChild>
            <Link to="/organizador/financeiro">
              <Wallet className="mr-2 h-4 w-4" /> Financeiro
            </Link>
          </DropdownMenuItem>
        ) : null}
        {account.roles.includes("SUPER_ADMIN") ? (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <ShieldCheck className="mr-2 h-4 w-4" /> Super Admin
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link to="/configuracoes">
            <Settings className="mr-2 h-4 w-4" /> Configurações
          </Link>
        </DropdownMenuItem>
        {account.roles.length > 1 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Trocar experiência
            </DropdownMenuLabel>
            {account.roles.map((role) => (
              <DropdownMenuItem
                key={role}
                onSelect={() => {
                  setActiveRole(role);
                  navigate({ to: homeForRole(role) });
                }}
              >
                {role === "ORGANIZER" ? "🏆" : "🏐"}{" "}
                <span className="ml-2">{ROLE_LABEL[role]}</span>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Modo demonstração
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/login">
            <Users className="mr-2 h-4 w-4" /> Trocar de usuário
          </Link>
        </DropdownMenuItem>
        <div className="grid grid-cols-2 gap-1 px-2 pb-2">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                // Atalho de demonstração: faz login de verdade com a conta
                // semeada, em vez de trocar o objeto de sessão no cliente.
                void signIn(a.email, DEMO_PASSWORD).then((account) => {
                  navigate({ to: homeForRole(account.roles[0] ?? null) });
                });
              }}
              className={`border px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide ${
                a.id === account.id
                  ? "border-accent text-accent"
                  : "border-border text-muted-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            // A sessão é encerrada no servidor; só depois a navegação acontece.
            void signOut().then(() => navigate({ to: "/login" }));
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
