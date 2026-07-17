import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export function V3RouteFrame({
  children,
  className,
  width = "reading",
}: {
  children: ReactNode;
  className?: string;
  width?: "reading" | "content";
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0",
        width === "reading"
          ? "max-w-[var(--layout-reading-column)]"
          : "max-w-[var(--layout-content-max)]",
        className,
      )}
      data-v3-layout="route-frame"
      data-v3-layout-width={width}
    >
      {children}
    </div>
  );
}

export function V3RouteHeader({
  eyebrow,
  title,
  description,
  className,
  titleId,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  titleId?: string;
}) {
  return (
    <header
      className={cn(
        "max-w-[var(--layout-reading-column)] space-y-2",
        className,
      )}
      data-v3-layout="route-header"
    >
      {eyebrow ? (
        <p className="v3-type-caption text-[var(--color-text-secondary)]">
          {eyebrow}
        </p>
      ) : null}
      <h1
        id={titleId}
        className="v3-type-screen hero-balance ko-keep text-[var(--color-text-primary)]"
      >
        {title}
      </h1>
      {description ? (
        <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function V3SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
      data-v3-layout="section-header"
    >
      <div className="min-w-0 max-w-[var(--layout-reading-column)]">
        {eyebrow ? (
          <p className="v3-type-caption text-[var(--color-text-secondary)]">
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            "v3-type-section ko-keep text-[var(--color-text-primary)]",
            eyebrow && "mt-1",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className="v3-type-body ko-keep mt-2 text-[var(--color-text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type V3SurfaceTone =
  | "surface"
  | "subtle"
  | "elevated"
  | "focus"
  | "attention"
  | "risk"
  | "stable"
  | "compare";

const V3_SURFACE_TONE: Record<V3SurfaceTone, string> = {
  surface:
    "border-[var(--color-border-default)] bg-[var(--color-background-surface)]",
  subtle:
    "border-[var(--color-border-default)] bg-[var(--color-background-subtle)]",
  elevated:
    "border-[var(--color-border-default)] bg-[var(--color-background-elevated)]",
  focus:
    "border-[var(--color-border-focus)] bg-[var(--color-background-focus)]",
  attention:
    "border-[var(--color-border-attention)] bg-[var(--color-background-attention)]",
  risk: "border-[var(--color-border-risk)] bg-[var(--color-background-risk)]",
  stable:
    "border-[var(--color-border-stable)] bg-[var(--color-background-stable)]",
  compare:
    "border-[var(--color-border-compare)] bg-[var(--color-background-compare)]",
};

export function V3Surface({
  children,
  className,
  tone = "surface",
  density = "default",
  labelledBy,
  as: Element = "div",
}: {
  children: ReactNode;
  className?: string;
  tone?: V3SurfaceTone;
  density?: "default" | "compact";
  labelledBy?: string;
  as?: "div" | "section" | "aside";
}) {
  return (
    <Element
      aria-labelledby={labelledBy}
      className={cn(
        "min-w-0 rounded-[var(--v3-radius-panel)] border",
        density === "compact" ? "p-4" : "p-5 sm:p-6",
        V3_SURFACE_TONE[tone],
        className,
      )}
      data-v3-component="Surface"
      data-v3-tone={tone}
      data-v3-density={density}
    >
      {children}
    </Element>
  );
}

type V3ActionTone = "primary" | "secondary" | "quiet";

const V3_ACTION_TONE: Record<V3ActionTone, string> = {
  primary:
    "bg-[var(--color-background-brand)] text-[var(--color-text-inverse)] hover:bg-[var(--color-background-brand-hover)]",
  secondary:
    "border border-[var(--color-border-strong)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]",
  quiet:
    "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)] hover:text-[var(--color-text-primary)]",
};

function v3ActionClass(tone: V3ActionTone, fullWidth: boolean, className?: string) {
  return cn(
    "v3-type-label-strong inline-flex min-h-[var(--control-height)] items-center justify-center rounded-[var(--v3-radius-control)] px-5 py-3 text-center transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background-canvas)]",
    "disabled:pointer-events-none disabled:bg-[var(--color-background-subtle)] disabled:text-[var(--color-text-tertiary)]",
    fullWidth ? "w-full" : "w-full sm:w-auto",
    V3_ACTION_TONE[tone],
    className,
  );
}

export function V3ActionLink({
  tone = "primary",
  fullWidth = false,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Link> & {
  tone?: V3ActionTone;
  fullWidth?: boolean;
}) {
  return (
    <Link
      className={v3ActionClass(tone, fullWidth, className)}
      data-v3-component="Action"
      data-v3-action-tone={tone}
      {...props}
    />
  );
}

export function V3ActionButton({
  tone = "primary",
  fullWidth = false,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: V3ActionTone;
  fullWidth?: boolean;
}) {
  return (
    <button
      type={type}
      className={v3ActionClass(tone, fullWidth, className)}
      data-v3-component="Action"
      data-v3-action-tone={tone}
      {...props}
    />
  );
}

export function V3QuietDisclosure({
  summary,
  helper,
  children,
  className,
  defaultOpen,
}: {
  summary: ReactNode;
  helper?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className={cn(
        "group rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-elevated)]",
        className,
      )}
      open={defaultOpen || undefined}
      data-v3-component="QuietDisclosure"
    >
      <summary className="v3-type-label-strong flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]">
        <span>{summary}</span>
        <span
          aria-hidden="true"
          className="text-[var(--color-text-secondary)] transition-transform group-open:rotate-180"
        >
          ⌄
        </span>
      </summary>
      {helper ? (
        <p className="v3-type-caption px-4 pb-3 text-[var(--color-text-secondary)]">
          {helper}
        </p>
      ) : null}
      <div className="v3-type-compact border-t border-[var(--color-border-default)] px-4 py-4 text-[var(--color-text-secondary)]">
        {children}
      </div>
    </details>
  );
}
