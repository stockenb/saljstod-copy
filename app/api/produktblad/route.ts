import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const FEED_URL = "https://www.nilsahlgren.se/upload/googleshopping/chat-feed-sv.xml";

type RawSpecNode =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null
  | undefined;

type NormalizedProduct = {
  articleNumber: string;
  title: string;
  link: string;
  image: string;
  description: string;
  weight: string;
  specs: { key: string; value: string }[];
};

const SPEC_KEY_REPLACEMENTS: Record<string, string> = {
  "Antal i primärförpackning": "Antal i primärförp.",
  "Antal i sekundärförpackning": "Antal i sekundärförp.",
  Primärförpackning: "Primärförp.",
};


function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeSpecs(node: RawSpecNode): { key: string; value: string }[] {
  const specs: { key: string; value: string }[] = [];

  const pushSpec = (key: string, value: string) => {
    const normalizedKey = key.trim() || "Specifikation";
    const normalizedValue = value.trim();
    const shortenedKey = SPEC_KEY_REPLACEMENTS[normalizedKey] ?? normalizedKey;

    if (!normalizedValue) {
      return;
    }

    specs.push({ key: shortenedKey, value: normalizedValue });
  };

  const pushFromText = (raw: string) => {
    const text = raw.replace(/\s+/g, " ").trim();
    if (!text) {
      return;
    }

    const delimiterIndex = text.indexOf(":");
    if (delimiterIndex === -1) {
      pushSpec("Specifikation", text);
      return;
    }

    const key = text.slice(0, delimiterIndex).trim();
    const value = text.slice(delimiterIndex + 1).trim();
    if (!key && !value) {
      return;
    }

    pushSpec(key || "Specifikation", value || text);
  };

  const appendFromObject = (obj: Record<string, unknown>) => {
    if (("key" in obj || "Key" in obj) && ("value" in obj || "Value" in obj)) {
      const key = String((obj as Record<string, unknown>).key ?? obj.Key ?? "");
      const unit = (obj as Record<string, unknown>).unit ?? obj.Unit;
      const value = String((obj as Record<string, unknown>).value ?? obj.Value ?? "");
      const valueWithUnit = unit ? `${value} ${String(unit)}` : value;
      pushSpec(key, valueWithUnit);
      return;
    }

    if ("specification" in obj && Object.keys(obj).length === 1) {
      appendNode(obj.specification as RawSpecNode);
      return;
    }

    if ("Specification" in obj && Object.keys(obj).length === 1) {
      appendNode(obj.Specification as RawSpecNode);
      return;
    }

    Object.entries(obj).forEach(([rawKey, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (rawKey === "specification" || rawKey === "specifications") {
        appendNode(value as RawSpecNode);
        return;
      }

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        const key = rawKey
          .replace(/[_-]+/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
        pushSpec(key, String(value));
        return;
      }

      appendNode(value as RawSpecNode);
    });
  };

  const appendNode = (value: RawSpecNode) => {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      pushFromText(String(value));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => appendNode(entry as RawSpecNode));
      return;
    }

    appendFromObject(value as Record<string, unknown>);
  };

  appendNode(node);

  return specs;
}

function parseWeight(weight: unknown): string {
  if (weight === null || weight === undefined) {
    return "";
  }

  if (typeof weight === "string" || typeof weight === "number") {
    return String(weight).trim();
  }

  if (typeof weight === "object") {
    const obj = weight as Record<string, unknown>;
    const value = obj["#text"] ?? obj.value ?? obj.Value ?? "";
    const unit = obj["@_unit"] ?? obj.unit ?? obj.Unit ?? "";

    const text = String(value ?? "").trim();
    const normalizedUnit = String(unit ?? "").trim();

    if (!text) {
      return "";
    }

    return normalizedUnit ? `${text} ${normalizedUnit}` : text;
  }

  return "";
}

function collectProductNodes(node: unknown): Record<string, unknown>[] {
  const products: Record<string, unknown>[] = [];

  const visit = (value: unknown, parentKey?: string) => {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, parentKey));
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const obj = value as Record<string, unknown>;

    if (parentKey === "Product") {
      products.push(obj);
    }

    Object.entries(obj).forEach(([key, entry]) => {
      visit(entry, key);
    });
  };

  visit(node);

  return products;
}

function getArticleNumbers(item: Record<string, unknown>): string[] {
  const values = [
    item["@_sku"],
    item.sku,
    item["@_id"],
    item.id,
  ];

  return values
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0);
}

function toProduct(item: Record<string, unknown>): NormalizedProduct {
  const specs = normalizeSpecs(
    (item.specifications as RawSpecNode) ??
      (item.specifikation as RawSpecNode) ??
      (item.Specifications as RawSpecNode) ??
      (item.Specification as RawSpecNode)
  );

  return {
    articleNumber: String(
      item.sku ?? item["@_sku"] ?? item.id ?? item["@_id"] ?? ""
    ),
    title: String(item.title ?? item.Name ?? ""),
    link: String(item.link ?? item.Link ?? ""),
    image: String(item.image_link ?? item.Image ?? ""),
    description: String(item.full_description ?? item.FullDescription ?? ""),
    weight: parseWeight(item.shipping_weight ?? item.Weight),
    specs,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const articleNumber = url.searchParams.get("id");

  if (!articleNumber) {
    return NextResponse.json({ error: "Ange ett artikelnummer." }, { status: 400 });
  }

  const trimmedArticleNumber = articleNumber.trim();

  try {
    const response = await fetch(FEED_URL, { next: { revalidate: 60 } });

    if (!response.ok) {
      throw new Error(`Feed-förfrågan misslyckades med status ${response.status}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      parseTagValue: true,
      trimValues: true,
    });
    const parsed = parser.parse(xml) as {
      rss?: { channel?: { item?: Record<string, unknown> | Record<string, unknown>[] } };
    };

    const productNodes = collectProductNodes(parsed);
    const matchedProduct = productNodes.find((item) =>
      getArticleNumbers(item).some((id) => id === trimmedArticleNumber)
    );

    let normalized: NormalizedProduct | undefined;

    if (matchedProduct) {
      normalized = toProduct(matchedProduct);
    }

    if (!normalized) {
      const itemsRaw = parsed?.rss?.channel?.item;
      const items = normalizeArray(itemsRaw);
      const legacyProduct = items.find((item) =>
        getArticleNumbers(item as Record<string, unknown>).some(
          (id) => id === trimmedArticleNumber
        )
      );

      if (legacyProduct) {
        normalized = toProduct(legacyProduct as Record<string, unknown>);
      }
    }

    if (!normalized) {
      return NextResponse.json(
        { error: "Ingen artikel hittades i flödet." },
        { status: 404 }
      );
    }

    return NextResponse.json({ product: normalized });
  } catch (error) {
    console.error("Fel vid hämtning av produktblad", error);
    return NextResponse.json(
      { error: "Kunde inte hämta data från produktflödet." },
      { status: 500 }
    );
  }
}
