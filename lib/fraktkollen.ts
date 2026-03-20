export type DataRow = Record<string, string | number | boolean | null | undefined>;

export type FraktkollenResult = {
  ordernummer: string;
  kundnamn: string;
  benamning: string;
  price: number;
  belopp: number;
  tackningsbidrag: number;
};

export type FraktkollenMatchOutput = {
  rows: FraktkollenResult[];
  unmatchedSendifyReferences: string[];
  unmatchedMonitorOrders: string[];
};

const NBSP = /\u00A0/g;

export function normalizeNumber(input: unknown): number {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : Number.NaN;
  }

  if (input == null) {
    return Number.NaN;
  }

  const raw = String(input).trim().replace(NBSP, " ");
  if (!raw) {
    return Number.NaN;
  }

  let normalized = raw.replace(/\s+/g, "");
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    const dotParts = normalized.split(".");
    if (dotParts.length > 2) {
      const decimal = dotParts.pop();
      normalized = `${dotParts.join("")}.${decimal ?? ""}`;
    }
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function validateColumns(rows: DataRow[], requiredColumns: string[]) {
  if (rows.length === 0) {
    return {
      ok: false,
      missingColumns: requiredColumns,
    };
  }

  const existingColumns = new Set(
    Object.keys(rows[0] ?? {})
      .map((column) => column.trim())
      .filter(Boolean),
  );

  const missingColumns = requiredColumns.filter((column) => !existingColumns.has(column));

  return {
    ok: missingColumns.length === 0,
    missingColumns,
  };
}

function summarizeBenamningar(benamningar: string[]) {
  const unique = [...new Set(benamningar.filter(Boolean))];
  if (unique.length === 0) {
    return "-";
  }
  if (unique.length <= 3) {
    return unique.join(", ");
  }
  return `${unique.slice(0, 3).join(", ")} …`;
}

export function matchAndCompute(sendifyRows: DataRow[], monitorRows: DataRow[]): FraktkollenMatchOutput {
  const monitorByOrder = new Map<
    string,
    {
      kundnamn: string;
      benamningar: string[];
      belopp: number;
    }
  >();

  for (const row of monitorRows) {
    const ordernummer = String(row.Ordernummer ?? "").trim();
    if (!ordernummer) {
      continue;
    }

    const current = monitorByOrder.get(ordernummer) ?? {
      kundnamn: String(row.Kundnamn ?? "").trim(),
      benamningar: [],
      belopp: 0,
    };

    if (!current.kundnamn) {
      current.kundnamn = String(row.Kundnamn ?? "").trim();
    }

    const benamning = String(row["Benämning"] ?? "").trim();
    if (benamning) {
      current.benamningar.push(benamning);
    }

    const belopp = normalizeNumber(row.Belopp);
    if (Number.isFinite(belopp)) {
      current.belopp += belopp;
    }

    monitorByOrder.set(ordernummer, current);
  }

  const matchedMonitorOrders = new Set<string>();
  const rows: FraktkollenResult[] = [];
  const unmatchedSendifyReferences: string[] = [];

  for (const row of sendifyRows) {
    const senderReference = String(row.SENDER_REFERENCE ?? "").trim();
    if (!senderReference) {
      continue;
    }

    const monitorOrder = monitorByOrder.get(senderReference);
    if (!monitorOrder) {
      unmatchedSendifyReferences.push(senderReference);
      continue;
    }

    matchedMonitorOrders.add(senderReference);
    const price = normalizeNumber(row.PRICE);
    const belopp = monitorOrder.belopp;

    rows.push({
      ordernummer: senderReference,
      kundnamn: monitorOrder.kundnamn || "-",
      benamning: summarizeBenamningar(monitorOrder.benamningar),
      price: Number.isFinite(price) ? price : 0,
      belopp,
      tackningsbidrag: belopp - (Number.isFinite(price) ? price : 0),
    });
  }

  const unmatchedMonitorOrders = [...monitorByOrder.keys()].filter(
    (orderNumber) => !matchedMonitorOrders.has(orderNumber),
  );

  rows.sort((a, b) => b.tackningsbidrag - a.tackningsbidrag);

  return {
    rows,
    unmatchedSendifyReferences: [...new Set(unmatchedSendifyReferences)].sort(),
    unmatchedMonitorOrders: unmatchedMonitorOrders.sort(),
  };
}
