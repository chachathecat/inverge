"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ACCOUNTING_TEMPLATE_REGISTRY,
  calculateFromAccountingParseResult,
  getAccountingTemplate,
  type AccountingParseResult,
  type TemplateInput,
} from "@/lib/review-os/accounting-template-engine";

const DEMO_PARSE_RESULT: AccountingParseResult = {
  subject: "회계학",
  templateId: "accounting_ppe_depreciation",
  confidence: 0.86,
  extractedInputs: {
    cost: 1200000,
    salvageValue: 200000,
    usefulLifeYears: 5,
    months: 12,
  },
  extractedLabels: ["취득원가", "잔존가치", "내용연수", "감가상각비"],
  needsHumanConfirmation: false,
};

function toInputValue(value: TemplateInput[string]) {
  if (value === undefined || value === null) return "";
  return String(value);
}

export function AccountingTemplateCard({ initialParseResult = DEMO_PARSE_RESULT }: { initialParseResult?: AccountingParseResult }) {
  const [parseResult, setParseResult] = useState(initialParseResult);
  const [confirmed, setConfirmed] = useState(false);
  const template = getAccountingTemplate(parseResult.templateId);
  const { validation, calculation } = calculateFromAccountingParseResult(parseResult, confirmed);
  const supportedTemplates = Object.values(ACCOUNTING_TEMPLATE_REGISTRY);
  const visibleInputKeys = template ? [...template.requiredInputs, ...template.optionalInputs] : Object.keys(parseResult.extractedInputs);

  const updateInput = (key: string, value: string) => {
    setConfirmed(false);
    setParseResult((current) => ({
      ...current,
      extractedInputs: {
        ...current.extractedInputs,
        [key]: value === "" ? "" : Number(value),
      },
    }));
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5 md:p-6">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] px-3 py-1 text-xs text-[color:var(--brand-700)]">템플릿 계산 v1</span>
          <span className="rounded-full border border-[color:var(--border-subtle)] px-3 py-1 text-xs text-[color:var(--muted)]">{parseResult.subject}</span>
        </div>
        <h3 className="text-title text-[color:var(--foreground-strong)]">회계·경제 계산 틀 확인</h3>
        <p className="text-sm leading-6 text-[color:var(--muted)]">AI는 유형과 숫자만 추출합니다. 계산은 Inverge 템플릿이 수행합니다.</p>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-2 text-sm font-medium text-[color:var(--foreground-strong)]">
          계산 유형
          <select
            value={parseResult.templateId ?? "unsupported"}
            onChange={(event) => {
              const nextTemplateId = event.target.value === "unsupported" ? null : (event.target.value as AccountingParseResult["templateId"]);
              const nextTemplate = getAccountingTemplate(nextTemplateId);
              setConfirmed(false);
              setParseResult((current) => ({
                ...current,
                templateId: nextTemplateId,
                subject: nextTemplateId?.startsWith("economics") ? "경제학" : "회계학",
                extractedInputs: nextTemplate
                  ? Object.fromEntries([...nextTemplate.requiredInputs, ...nextTemplate.optionalInputs].map((key) => [key, current.extractedInputs[key] ?? ""]))
                  : current.extractedInputs,
                extractedLabels: nextTemplate ? nextTemplate.allowedLabels.slice(0, 2) : current.extractedLabels,
                needsHumanConfirmation: true,
              }));
            }}
            className="min-h-11 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-3 text-sm"
          >
            {supportedTemplates.map((entry) => (
              <option key={entry.templateId} value={entry.templateId}>{entry.displayName}</option>
            ))}
            <option value="unsupported">지원 전 유형</option>
          </select>
        </label>

        {template ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleInputKeys.map((key) => {
              const required = template.requiredInputs.includes(key);
              return (
                <label key={key} className="grid gap-2 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-3 text-xs font-medium text-[color:var(--muted)]">
                  <span>{key}{required ? " · 필수" : " · 선택"}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={toInputValue(parseResult.extractedInputs[key])}
                    onChange={(event) => updateInput(key, event.target.value)}
                    className="min-h-11 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 text-sm text-[color:var(--foreground-strong)]"
                  />
                </label>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4 text-sm leading-6 text-[color:var(--muted)]">
            아직 지원하지 않는 계산 유형입니다. OCR/분류 결과만 저장할 수 있습니다.
          </div>
        )}
      </div>

      {validation.unknownLabels.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-3 text-sm leading-6 text-[color:var(--foreground-strong)]">
          확인되지 않은 계정명: {validation.unknownLabels.join(", ")}. 계정명을 확인한 뒤 계산합니다.
        </div>
      ) : null}

      {validation.message ? (
        <div className="mt-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-3 text-sm leading-6 text-[color:var(--muted)]">{validation.message}</div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => setConfirmed(true)} className="w-full sm:w-auto">
          숫자 확인 후 계산
        </Button>
        <Button type="button" variant="outline" onClick={() => setConfirmed(false)} className="w-full sm:w-auto">
          다시 확인
        </Button>
      </div>

      {calculation ? (
        <article className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] p-4">
          <p className="text-caption text-[color:var(--brand-700)]">결정론적 결과</p>
          <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground-strong)]">
            {calculation.resultLabel}: {calculation.resultValue.toLocaleString("ko-KR")}{calculation.unit ?? ""}
          </p>
          <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">LLM 답안 문장이 아니라 Inverge 템플릿 계산 결과입니다.</p>
          <details className="mt-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3">
            <summary className="cursor-pointer text-sm font-medium text-[color:var(--foreground-strong)]">{template?.renderHints.collapsedDetailTitle ?? "계산 세부 보기"}</summary>
            <div className="mt-3 grid gap-2">
              {calculation.intermediateValues.map((entry) => (
                <div key={entry.label} className="rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-3 py-2 text-sm text-[color:var(--foreground-strong)]">
                  {entry.label}: {typeof entry.value === "number" ? entry.value.toLocaleString("ko-KR") : entry.value}
                </div>
              ))}
              <ol className="space-y-1 text-xs leading-5 text-[color:var(--muted)]">
                {calculation.formulaSteps.map((step, index) => (
                  <li key={step}>{index + 1}. {step}</li>
                ))}
              </ol>
            </div>
          </details>
        </article>
      ) : null}
    </section>
  );
}
