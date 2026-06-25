import Link from "next/link";
import type { ReactNode } from "react";

export function AppButton({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles = {
    primary: "border border-[#0B8F89] bg-[#0FA19A] text-white hover:bg-[#0B8F89]",
    secondary: "border border-[#D1DAD8] bg-white text-[#1F2328] hover:bg-[#F6F8F7]",
    danger: "border border-[#DC2626] bg-[#DC2626] text-white hover:bg-[#B91C1C]",
  };
  return (
    <button
      {...props}
      className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function AppInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 rounded-lg border border-[#DDE5E3] bg-white px-3 text-sm font-semibold text-[#1F2328] outline-none transition focus:border-[#0FA19A] focus:ring-2 focus:ring-[#D6F3F1] ${props.className ?? ""}`}
    />
  );
}

export function AppSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 rounded-lg border border-[#DDE5E3] bg-white px-3 text-sm font-semibold text-[#1F2328] outline-none transition focus:border-[#0FA19A] focus:ring-2 focus:ring-[#D6F3F1] ${props.className ?? ""}`}
    />
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "neutral" }) {
  const tones = {
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    neutral: "bg-gray-100 text-gray-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${tones[tone]}`}>{children}</span>;
}

export function StatCard({ title, value, helper, href }: { title: string; value: string | number; helper?: string; href?: string }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-extrabold text-[#5F6B67]">{title}</p>
        {href && <span className="text-sm font-black text-[#0FA19A]">Voir</span>}
      </div>
      <p className="mt-4 text-3xl font-black text-[#1F2328]">{value}</p>
      {helper && <p className="mt-2 text-xs font-bold text-[#6B7280]">{helper}</p>}
    </>
  );
  const className = "rounded-lg border border-[#DDE5E3] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]";
  if (href) {
    return <Link href={href} className={`${className} block transition hover:-translate-y-0.5 hover:border-[#B7D9D3]`}>{content}</Link>;
  }
  return (
    <div className={className}>{content}</div>
  );
}

export function DataTable<T>({
  rows,
  columns,
}: {
  rows: T[];
  columns: Array<{ key: string; header: string; render: (row: T) => ReactNode }>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#DDE5E3] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[#DDE5E3] bg-[#F8FAFB] text-xs uppercase text-[#6B7280]">
          <tr>{columns.map((column) => <th key={column.key} className="px-4 py-3 font-black tracking-normal">{column.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#EEF2F1]">
          {rows.map((row, index) => (
            <tr key={index} className="text-[#1F2328] hover:bg-[#FAFCFC]">
              {columns.map((column) => <td key={column.key} className="px-4 py-3 align-middle font-semibold">{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LoadingState({ label = "Chargement..." }: { label?: string }) {
  return <div className="rounded-lg border border-[#DDE5E3] bg-white p-8 text-center text-sm font-bold text-[#6B7280]">{label}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">{message}</div>;
}

export function EmptyState({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="rounded-lg border border-[#DDE5E3] bg-white p-8 text-center">
      <p className="font-black text-[#1F2328]">{title}</p>
      {actionHref && actionLabel && <Link className="mt-4 inline-flex rounded-lg bg-[#0FA19A] px-4 py-2 text-sm font-extrabold text-white" href={actionHref}>{actionLabel}</Link>}
    </div>
  );
}
