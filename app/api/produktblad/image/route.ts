import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const src = url.searchParams.get("src");

  if (!src) {
    return NextResponse.json({ error: "Ange en bildadress." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return NextResponse.json({ error: "Ogiltig bildadress." }, { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.has(target.protocol)) {
    return NextResponse.json({ error: "Ogiltigt protokoll för bild." }, { status: 400 });
  }

  try {
    const response = await fetch(target.toString());
    if (!response.ok) {
      return NextResponse.json({ error: "Kunde inte hämta bild." }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Ogiltig bildtyp." }, { status: 415 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = contentType.split(";")[0] || "image/png";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json(
      { dataUrl },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  } catch (error) {
    console.error("Kunde inte hämta produktbild", error);
    return NextResponse.json({ error: "Kunde inte läsa in bilden." }, { status: 500 });
  }
}
