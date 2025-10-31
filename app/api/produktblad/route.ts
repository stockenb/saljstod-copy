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

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeSpecs(node: RawSpecNode): { key: string; value: string }[] {
  const specs: { key: string; value: string }[] = [];

  const appendFromObject = (obj: Record<string, unknown>) => {
    Object.entries(obj).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        specs.push({ key, value: String(value) });
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry === null || entry === undefined) {
            return;
          }

          if (
            typeof entry === "string" ||
            typeof entry === "number" ||
            typeof entry === "boolean"
          ) {
            specs.push({ key, value: String(entry) });
          } else if (typeof entry === "object") {
            appendFromObject(entry as Record<string, unknown>);
          }
        });
        return;
      }

      if (typeof value === "object") {
        appendFromObject(value as Record<string, unknown>);
      }
    });
  };

  if (node === null || node === undefined) {
    return specs;
  }

  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    specs.push({ key: "Specifikation", value: String(node) });
    return specs;
  }

  if (Array.isArray(node)) {
    node.forEach((entry) => {
      if (entry === null || entry === undefined) {
        return;
      }

      if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
        specs.push({ key: "Specifikation", value: String(entry) });
      } else if (typeof entry === "object") {
        appendFromObject(entry as Record<string, unknown>);
      }
    });
    return specs;
  }

  appendFromObject(node as Record<string, unknown>);
  return specs;
}

function toProduct(item: Record<string, unknown>): NormalizedProduct {
  const specs = normalizeSpecs(item.specifikation as RawSpecNode);

  return {
    articleNumber: String(item.id ?? ""),
    title: String(item.title ?? ""),
    link: String(item.link ?? ""),
    image: String(item.image_link ?? ""),
    description: String(item.full_description ?? ""),
    weight: String(item.shipping_weight ?? ""),
    specs,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const articleNumber = url.searchParams.get("id");

  if (!articleNumber) {
    return NextResponse.json({ error: "Ange ett artikelnummer." }, { status: 400 });
  }

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
      parseNodeValue: true,
      trimValues: true,
    });
    const parsed = parser.parse(xml) as {
      rss?: { channel?: { item?: Record<string, unknown> | Record<string, unknown>[] } };
    };

    const itemsRaw = parsed?.rss?.channel?.item;
    const items = normalizeArray(itemsRaw);
    const product = items.find((item) => {
      const productId = item?.id;
      return productId !== undefined && String(productId) === articleNumber;
    });

    if (!product) {
      return NextResponse.json(
        { error: "Ingen artikel hittades i flödet." },
        { status: 404 }
      );
    }

    const normalized = toProduct(product);

    return NextResponse.json({ product: normalized });
  } catch (error) {
    console.error("Fel vid hämtning av produktblad", error);
    return NextResponse.json(
      { error: "Kunde inte hämta data från produktflödet." },
      { status: 500 }
    );
  }
}
