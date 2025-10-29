export async function POST(req: Request) {
  try {
    const body = await req.json();
    const CART_API_URL = process.env.CART_API_URL;
    const CART_API_KEY = process.env.CART_API_KEY;

    if (!CART_API_URL) {
      return new Response(JSON.stringify({ error: "Missing CART_API_URL" }), {
        status: 500,
      });
    }
    if (!CART_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing CART_API_KEY" }), {
        status: 500,
      });
    }

    const res = await fetch(CART_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CART_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ upstreamStatus: res.status, data }), {
        status: 502,
      });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message || err) }),
      { status: 500 }
    );
  }
}
