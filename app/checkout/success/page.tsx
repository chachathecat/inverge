import { Suspense } from "react";

import { CheckoutSuccess } from "@/components/inverge/checkout-result";

export default function CheckoutSuccessRoute() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccess />
    </Suspense>
  );
}
