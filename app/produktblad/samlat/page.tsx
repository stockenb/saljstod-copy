import { Suspense } from "react";

import CombinedProductSheetClientPage from "./combined-product-sheet-client";

export default function CombinedProductSheetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Laddar...</div>}>
      <CombinedProductSheetClientPage />
    </Suspense>
  );
}
