/**
 * Estados de rede das tabelas administrativas.
 *
 * Arquivo **novo**, e de propósito: `admin-shell.tsx` vem do baseline e é fonte
 * de verdade de aparência (CLAUDE.md §2). Acrescentar export lá seria uma
 * divergência sem necessidade — aqui o `AdminTable` continua idêntico e só
 * recebe uma linha diferente como filho.
 *
 * Os três estados vivem **dentro** da estética atual (§15): o esqueleto usa as
 * mesmas caixas da tabela, o erro usa a mesma tipografia, e nenhum layout novo
 * é inventado.
 */

import type { ReactNode } from "react";

/** Linha de esqueleto — mesma altura das linhas reais, para a tabela não pular. */
function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columns }, (_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full animate-pulse bg-muted" />
        </td>
      ))}
    </tr>
  );
}

type AdminTableStateProps = {
  columns: number;
  isPending: boolean;
  isError: boolean;
  error?: { message: string } | null | undefined;
  isEmpty: boolean;
  emptyMessage: string;
  onRetry?: (() => void) | undefined;
  children: ReactNode;
};

/**
 * Decide o que a tabela mostra.
 *
 * A ordem importa: carregando → erro → vazio → dados. Um erro tratado depois do
 * vazio faria a tela dizer "nenhum resultado" quando na verdade a API está
 * fora — que é a mentira mais cara de uma tela administrativa.
 */
export function AdminTableState({
  columns,
  isPending,
  isError,
  error,
  isEmpty,
  emptyMessage,
  onRetry,
  children,
}: AdminTableStateProps) {
  if (isPending) {
    return (
      <>
        <SkeletonRow columns={columns} />
        <SkeletonRow columns={columns} />
        <SkeletonRow columns={columns} />
      </>
    );
  }

  if (isError) {
    return (
      <tr>
        <td colSpan={columns} className="px-4 py-10 text-center">
          <p className="text-sm">Não foi possível carregar estes dados.</p>
          {/* Mensagem do backend, nunca inventada aqui (§15). */}
          <p className="mt-1 text-sm text-muted-foreground">{error?.message}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex h-10 items-center border border-border px-4 font-display text-[11px] font-bold uppercase tracking-widest"
            >
              Tentar de novo
            </button>
          ) : null}
        </td>
      </tr>
    );
  }

  if (isEmpty) {
    return (
      <tr>
        <td colSpan={columns} className="px-4 py-10 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </td>
      </tr>
    );
  }

  return <>{children}</>;
}

/**
 * Formata um instante ISO 8601 para leitura.
 *
 * A API sempre manda ISO com timezone (§13); a formatação é apresentação e
 * acontece só aqui. `pt-BR` fixo porque o produto é brasileiro — não é
 * negociação de locale do navegador.
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Só a data, para colunas onde a hora não acrescenta nada. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
