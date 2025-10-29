import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const FEED_URL = "https://www.nilsahlgren.se/upload/googleshopping/feed-sv.xml";

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch(FEED_URL, { next: { revalidate } });
    if (!res.ok) {
      return NextResponse.json({ error: "Kunde inte hÃ¤mta XML-feed" }, { status: 502 });
    }

    const xml = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      attributeNamePrefix: "",
    });

    const json = parser.parse(xml);
    const items = Array.isArray(json?.rss?.channel?.item)
      ? json.rss.channel.item
      : json?.rss?.channel?.item
      ? [json.rss.channel.item]
      : [];

    const prices: Record<string, number> = {};
    for (const it of items) {
      const rawId =
        it?.id ?? it?.gid ?? it?.sku ?? it?.mpn ?? it?.MPN ?? it?.["g:id"];
      const rawPrice =
        it?.sale_price ?? it?.price ?? it?.["g:sale_price"] ?? it?.["g:price"];

      if (!rawId || !rawPrice) continue;

      const num = parseFloat(
        String(rawPrice)
          .replace(/[^\d.,]/g, "")
          .replace(",", ".")
      );
      if (!Number.isFinite(num)) continue;

      prices[String(rawId).trim().toLowerCase()] = num;
    }

    return NextResponse.json({ prices });
  } catch (e) {
    return NextResponse.json({ error: "Fel vid parsing av XML" }, { status: 500 });
  }
}
