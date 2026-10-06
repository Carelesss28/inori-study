"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------- buttons */

type Variant = "pink" | "soft" | "ghost" | "outline" | "danger";

const variants: Record<Variant, string> = {
  pink: "bg-pink text-pink-ink hover:bg-pink-strong shadow-[0_6px_14px_-8px_rgb(217_137_155/0.9)]",
  soft: "bg-pink-soft text-ink hover:bg-pink/40",
  ghost: "text-ink-soft hover:bg-panel-2 hover:text-ink",
  outline: "border border-line-strong bg-panel text-ink hover:bg-panel-2",
  danger: "bg-danger/10 text-danger hover:bg-danger/20",
};

export function buttonClass(variant: Variant = "pink", size: "sm" | "md" = "md") {
  return cx(
    "inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lav",
    size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
    variants[variant]
  );
}

export function Button({
  variant = "pink",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; icon?: IconName }) {
  return (
    <button type="button" className={cx(buttonClass(variant, size), className)} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className,
  tone = "plain",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; tone?: "plain" | "pink" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-lav",
        tone === "pink" ? "bg-pink-soft text-pink-strong hover:bg-pink/40" : "text-ink-soft hover:bg-panel-2 hover:text-ink",
        className
      )}
      {...rest}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-ink">
      <Icon name="chevronLeft" size={14} />
      {children}
    </Link>
  );
}

/* ----------------------------------------------------------------- meters */

export function ProgressBar({
  value,
  tone = "lav",
  className,
  label,
}: {
  value: number;
  tone?: "lav" | "rose" | "teal" | "pink";
  className?: string;
  label?: string;
}) {
  const fill = { lav: "bg-lav", rose: "bg-rose", teal: "bg-teal", pink: "bg-pink" }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cx("h-2 w-full overflow-hidden rounded-full bg-track", className)}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      title={label ? `${label}: ${Math.round(v)}%` : `${Math.round(v)}%`}
    >
      <div className={cx("h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Single-value ring meter (dashboard overview, quiz score). */
export function Ring({
  value,
  size = 120,
  thickness = 12,
  tone = "lav",
  children,
  label,
}: {
  value: number;
  size?: number;
  thickness?: number;
  tone?: "lav" | "teal";
  children?: ReactNode;
  label: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const color = tone === "teal" ? "var(--c-teal)" : "var(--c-lav)";
  return (
    <div className="relative shrink-0" style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }} role="img" aria-label={`${label}: ${Math.round(v)}%`} title={`${label}: ${Math.round(v)}%`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-track)" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - v / 100)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ overlays */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(var(--c-shadow)/0.45)] p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx("card pop-in flex max-h-[92vh] w-full flex-col rounded-b-none sm:rounded-b-[18px]", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-base font-extrabold text-ink">
            {title}
          </h2>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export interface MenuItem {
  label: string;
  icon?: IconName;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function Menu({ items, label = "More options", className }: { items: MenuItem[]; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className={cx("relative", className)}>
      <IconButton
        icon="dots"
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      />
      {open && (
        <div role="menu" className="card pop-in absolute right-0 top-10 z-30 min-w-44 p-1.5">
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
              className={cx(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold disabled:opacity-40",
                item.danger ? "text-danger hover:bg-danger/10" : "text-ink hover:bg-panel-2"
              )}
            >
              {item.icon && <Icon name={item.icon} size={15} />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- form */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-lav",
        checked ? "bg-lav" : "bg-track"
      )}
    >
      <span className={cx("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-lav focus:outline-none focus:ring-2 focus:ring-lav/30";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

export function EmptyState({ title, body, action, art }: { title: string; body: string; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      {art}
      <h3 className="mt-3 text-base font-extrabold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Confirm({
  open,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">{body}</p>
    </Modal>
  );
}
