import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function AdminHomePage() {
  return (
    <main className="mx-auto w-full max-w-[900px] px-5 py-10 sm:px-8">
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
        <p className="text-caption font-medium text-[color:var(--muted)]">Inverge Admin</p>
        <h1 className="mt-3 text-h1 font-medium text-[color:var(--foreground-strong)]">Admin correction tools</h1>
        <p className="mt-4 max-w-2xl text-body text-[color:var(--muted)]">
          Minimal beta operations for curriculum mapping, root-cause tags, and rewrite seed templates.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/admin/curriculum" className={buttonVariants({ size: "lg" })}>
            Curriculum mapping
          </Link>
          <Link href="/admin/root-cause-tags" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Root-cause tags
          </Link>
          <Link href="/admin/rewrite-seed-templates" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Rewrite seeds
          </Link>
          <Link href="/admin/ai-outputs" className={buttonVariants({ variant: "outline", size: "lg" })}>
            AI outputs
          </Link>
          <Link href="/admin/sets" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Sets
          </Link>
          <Link href="/admin/beta-funnel" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Beta funnel QA
          </Link>
        </div>
      </section>
    </main>
  );
}
