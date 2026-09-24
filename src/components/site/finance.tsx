import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  brl,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  REFUND_STATUS_LABEL,
  REFUND_STATUS_TONE,
  type LedgerEntry,
  type PaymentStatus,
  type RefundStatus,
  type Tone,
} from "@/lib/finance-data";

const toneClass: Record<Tone, string> = {
  ok: "border-success/40 bg-success/10 text-success",
  warn: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
};

const dotClass: Record<Tone, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground",
};

export function FinancePill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest",
        toneClass[tone],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass[tone])} />
      {children}
    </span>
  );
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return (
    <FinancePill tone={PAYMENT_STATUS_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</FinancePill>
  );
}

export function RefundStatusPill({ status }: { status: RefundStatus }) {
  return <FinancePill tone={REFUND_STATUS_TONE[status]}>{REFUND_STATUS_LABEL[status]}</FinancePill>;
}

/** Card de valor com origem/destino explícitos — dinheiro nunca é só um número. */
export function MoneyCard({
  label,
  cents,
  hint,
  emphasis = false,
  tone,
}: {
  label: string;
  cents: number;
  hint?: string;
  emphasis?: boolean;
  tone?: Tone;
}) {
  return (
    <div
      className={cn(
        "border bg-card p-4",
        emphasis ? "border-graphite bg-sand-deep/30" : "border-border",
        tone === "danger" && "border-destructive/40",
      )}
    >
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p
        className={cn(
          "score-num mt-1 text-2xl font-bold tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "ok" && "text-success",
        )}
      >
        {brl(cents)}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Linha de decomposição financeira (bruto → taxas → líquido). */
export function MoneyRow({
  label,
  cents,
  detail,
  negative = false,
  strong = false,
}: {
  label: string;
  cents: number;
  detail?: string;
  negative?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-baseline gap-2 px-4 py-3", strong && "bg-sand-deep/30")}
    >
      <div className="min-w-[180px] flex-1">
        <p className={cn("text-sm", strong && "font-display font-bold")}>{label}</p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </div>
      <span
        className={cn(
          "score-num tabular-nums",
          strong ? "text-lg font-bold" : "text-sm",
          negative && "text-destructive",
        )}
      >
        {negative ? "− " : ""}
        {brl(Math.abs(cents))}
      </span>
    </div>
  );
}

/** Timeline auditável de um pagamento ou reembolso. */
export function FinanceTimeline({ entries }: { entries: LedgerEntry[] }) {
  return (
    <ol className="relative ml-2 border-l border-border">
      {entries.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative py-3 pl-5">
          <span className="absolute -left-[5px] top-5 h-2 w-2 rounded-full bg-accent" />
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-display text-sm font-bold">{e.label}</p>
            {typeof e.amountCents === "number" ? (
              <span
                className={cn(
                  "score-num text-sm tabular-nums",
                  e.amountCents < 0 && "text-destructive",
                )}
              >
                {e.amountCents < 0 ? "− " : ""}
                {brl(Math.abs(e.amountCents))}
              </span>
            ) : null}
            <span className="ml-auto text-xs text-muted-foreground">{e.at}</span>
          </div>
          <p className="text-xs text-muted-foreground">{e.detail}</p>
        </li>
      ))}
    </ol>
  );
}

export function GatewayBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-border bg-card px-2 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Pagamento processado pelo Asaas
    </span>
  );
}

export function FinanceAlert({
  tone = "warn",
  title,
  children,
  action,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border p-4",
        tone === "danger"
          ? "border-destructive/40 bg-destructive/10"
          : tone === "ok"
            ? "border-success/40 bg-success/10"
            : "border-warning/40 bg-warning/10",
      )}
    >
      <div className="min-w-[220px] flex-1">
        <p className="font-display text-sm font-bold">{title}</p>
        {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest",
            value === o
              ? "border-graphite bg-graphite text-background"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
