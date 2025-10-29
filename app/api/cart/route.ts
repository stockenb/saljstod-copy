import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const CART_API_URL = process.env.CART_API_URL || "https://api.nilsahlgren.se/api/cart";
    const CART_API_KEY = process.env.CART_API_KEY;

    if (!CART_API_KEY) {
      return NextResponse.json({ error: "Missing CART_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.products)) {
      return NextResponse.json({ error: "Invalid body. Expected { products: [...] }" }, { status: 400 });
    }

    const upstream = await fetch(CART_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CART_API_KEY,
      },
      body: JSON.stringify({ products: body.products }),
      cache: "no-store",
    });

    const text = await upstream.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream error", status: upstream.status, data },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/cart", method: "GET" });
}
