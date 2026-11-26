import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    expectedToken &&
    token === expectedToken &&
    challenge
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  const signature = request.headers.get("x-hub-signature-256");

  if (!appSecret || !signature?.startsWith("sha256=")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rawBody = await request.text();

  const expectedSignature =
    "sha256=" +
    createHmac("sha256", appSecret).update(rawBody).digest("hex");

  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    JSON.parse(rawBody);
    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }
}
