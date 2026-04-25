import { Suspense } from "react";

import { CheckoutCancel } from "@/components/inverge/checkout-result";

export default function CheckoutCancelRoute() {
  return (
    <Suspense fallback={null}>
      <CheckoutCancel />
    </Suspense>
  );
}
