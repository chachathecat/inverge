import type { ReactNode } from "react";
import { notFound } from "next/navigation";

export default function ActuarySecondExamLayout({ children }: { children: ReactNode }) {
  void children;
  notFound();
}
