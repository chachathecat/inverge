import type { PresentValueFormulaFamilyId } from "@/lib/actuary-second/types";

export const presentValueFormulaFamilies: Record<
  PresentValueFormulaFamilyId,
  {
    publicLabel: string;
    patternHints: RegExp[];
    failureClass: "formula_selection_error";
  }
> = {
  pv_single_payment_basic: {
    publicLabel: "Single Payment PV",
    patternHints: [/1\/\(1\+i\)\^n/i, /v\^n/i, /single payment/i, /discounted single/i],
    failureClass: "formula_selection_error",
  },
  pv_ordinary_annuity_basic: {
    publicLabel: "Ordinary Annuity PV",
    patternHints: [/\(1-v\^n\)\/i/i, /a-angle/i, /ordinary/i, /end of period/i, /annuity immediate/i],
    failureClass: "formula_selection_error",
  },
  pv_annuity_due_basic: {
    publicLabel: "Annuity Due PV",
    patternHints: [/\(1\+i\)/i, /annuity due/i, /beginning of period/i, /\/v/i, /due/i, /ddot/i],
    failureClass: "formula_selection_error",
  },
  pv_deferred_annuity_basic: {
    publicLabel: "Deferred Annuity PV",
    patternHints: [/defer/i, /v\^\d+/i, /deferred/i, /starts? after/i, /wait/i],
    failureClass: "formula_selection_error",
  },
  pv_annuity_factor_form: {
    publicLabel: "Annuity Factor Form",
    patternHints: [/a-angle/i, /\(1-v\^n\)\/i/i, /factor/i, /annuity factor/i],
    failureClass: "formula_selection_error",
  },
};
