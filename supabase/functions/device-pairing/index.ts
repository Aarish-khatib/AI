import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const cors = {
  "access-control-allow-origin": Deno.env.get("LIMITLESS_APP_ORIGIN") || "",
  "access-control-allow-headers": "authorization, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "cache-control": "no-store",
  "content-type": "application/json",
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomDigits() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return reply(405, { error: "Method not allowed." });

  const url = Deno.env.get("SUPABASE_URL");
  const publishable = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("authorization") || "";
  if (!url || !publishable || !serviceRole || !authorization.startsWith("Bearer ")) {
    return reply(401, { error: "Pairing infrastructure is not configured." });
  }

  const userClient = createClient(url, publishable, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return reply(401, { error: "Authentication is required." });

  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(input.action || "");
  const now = new Date();

  if (action === "create") {
    const deviceName = String(input.deviceName || "Limitless Desktop").trim().slice(0, 80);
    const code = randomDigits();
    const { data, error } = await admin.from("device_pairing_codes").insert({
      user_id: authData.user.id,
      device_name: deviceName,
      code_hash: await sha256(code),
      expires_at: new Date(now.getTime() + 5 * 60_000).toISOString(),
    }).select("id,expires_at").single();
    if (error) return reply(400, { error: "Pairing code could not be created." });
    return reply(200, { pairingId: data.id, code, expiresAt: data.expires_at });
  }

  if (action === "consume") {
    const pairingId = String(input.pairingId || "");
    const code = String(input.code || "");
    const credential = crypto.randomUUID() + crypto.randomUUID();
    const { data: record, error } = await admin.from("device_pairing_codes")
      .select("id,user_id,device_name,code_hash,attempts,expires_at,consumed_at")
      .eq("id", pairingId).eq("user_id", authData.user.id).maybeSingle();
    if (error || !record || record.consumed_at || new Date(record.expires_at) < now) {
      return reply(400, { error: "Pairing code is invalid or expired." });
    }
    const attempts = Number(record.attempts || 0) + 1;
    if (attempts > 5 || await sha256(code) !== record.code_hash) {
      await admin.from("device_pairing_codes")
        .update({ attempts: Math.min(attempts, 5) })
        .eq("id", record.id)
        .eq("attempts", record.attempts)
        .is("consumed_at", null);
      return reply(400, { error: "Pairing code is invalid or expired." });
    }
    const consumedAt = now.toISOString();
    const { data: consumed } = await admin.from("device_pairing_codes")
      .update({ attempts, consumed_at: consumedAt })
      .eq("id", record.id)
      .eq("attempts", record.attempts)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();
    if (!consumed) return reply(409, { error: "Pairing code was already used." });
    const { data: device, error: deviceError } = await admin.from("user_devices").insert({
      user_id: authData.user.id,
      name: record.device_name,
      platform: String(input.platform || "unknown").slice(0, 20),
      status: "paired",
      permissions: ["project-read"],
      credential_hash: await sha256(credential),
    }).select("id,name,platform,status,permissions,created_at").single();
    if (deviceError) return reply(400, { error: "Device could not be registered." });
    return reply(200, { device, credential });
  }

  if (action === "revoke") {
    const deviceId = String(input.deviceId || "");
    await admin.from("remote_sessions").update({
      status: "revoked", permissions: [], revoked_at: now.toISOString(),
    }).eq("user_id", authData.user.id).eq("device_id", deviceId);
    const { error } = await admin.from("user_devices").update({
      status: "revoked", permissions: [], revoked_at: now.toISOString(),
      credential_version: 2,
    }).eq("user_id", authData.user.id).eq("id", deviceId);
    return error ? reply(400, { error: "Device could not be revoked." }) : reply(200, { revoked: true });
  }

  return reply(400, { error: "Unsupported pairing action." });
});
