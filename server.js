// server.js
require("dotenv").config();

const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const PORT = process.env.PORT || 3000;

// ---- sanity checks
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
console.error("🚨 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
process.exit(1);
}

// ---- supabase (service role for inserts)
const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---- express
const app = express();

/**
* NOTE ABOUT BODY PARSING ORDER
* -----------------------------
* We want the Jotform webhook route to read the raw stream.
* So we put the raw route BEFORE any global JSON/urlencoded parsers.
*/

// Jotform webhook route (RAW)
app.post(
"/",
express.raw({ type: "*/*" }), // <- important
async (req, res) => {
try {
// ---- print headers and first bytes for debugging
console.log("🧾 Headers:", req.headers);
const raw = req.body ? req.body.toString("utf8") : "";
console.log("📦 Raw length:", raw.length);
console.log("📦 Raw first 200:", raw.slice(0, 200));

// ---- parse body
let data = {};
if (!raw) {
console.warn("⚠️ Empty body");
} else {
try {
data = JSON.parse(raw);
// Jotform sometimes nests JSON in rawRequest string
if (typeof data === "string") data = JSON.parse(data);
if (data && typeof data.rawRequest === "string") {
try {
data = JSON.parse(data.rawRequest);
if (typeof data === "string") data = JSON.parse(data);
} catch (e) {
console.warn("⚠️ rawRequest parse failed:", e?.message);
}
}
} catch (e) {
console.error("❌ JSON parse error:", e?.message);
return res.status(400).send("Invalid JSON payload");
}
}

console.log("🔑 Parsed keys:", Object.keys(data));

// ---- helper to turn '64%' -> 64
const toNumber = (v) => {
if (v === null || v === undefined) return null;
if (typeof v === "number") return v;
const s = String(v).trim();
if (s === "") return null;
const n = parseFloat(s.replace(/%/g, ""));
return Number.isFinite(n) ? n : null;
};

// ---- map fields (update these if your form keys change)
const email = data.q12_q12_email ?? data.q12_email ?? data.email ?? null;
const user_id = data.q189_q189_user_id ?? data.user_id ?? null;

const payload = {
user_id,
email,
submission_date: new Date().toISOString(),

activate_percentage: toNumber(data.q187_activate_percentage),
activate_category: data.q134_activate_category ?? null,
activate_wtm: data.q155_activate_insight ?? null,
activate_yns: data.q177_activate_yns ?? null,

build_percentage: toNumber(data.q129_build_percentage),
build_category: data.q136_build_category ?? null,
build_wtm: data.q156_build_insight ?? null,
build_yns: data.q178_build_yns ?? null,

leverage_percentage: toNumber(data.q130_leverage_percentage),
leverage_category: data.q137_leverage_category ?? null,
leverage_wtm: data.q157_leverage_insight ?? null,
leverage_yns: data.q179_leverage_yns ?? null,

execute_percentage: toNumber(data.q186_execute_percentage),
execute_category: data.q138_execute_category ?? null,
execute_wtm: data.q158_execute_insight ?? null,
execute_yns: data.q180_execute_yns ?? null,

final_percentage: toNumber(data.q133_final_percentage),
final_summary_wtm: data.q159_final_summary_insight ?? null,
final_summary_yns: data.q188_final_summary_yns ?? null,
};

console.log("🧩 Mapped payload:", payload);

// ---- sanity: required user & email
if (!payload.user_id || !payload.email) {
console.warn("⚠️ Missing user_id/email:", {
user_id: payload.user_id,
email: payload.email,
});
return res.status(400).send("Missing user_id or email");
}

// ---- insert
const { error: insertError } = await supabase
.from("assessment_results_2")
.insert([payload]);

if (insertError) {
console.error("❌ Insert error:", insertError);
return res.status(500).send("Insert failed");
}

// ---- update profiles flag
const { error: updateError } = await supabase
.from("profiles")
.update({ assessment_taken: true })
.eq("id", payload.user_id);

if (updateError) {
console.error("⚠️ Profile flag update failed:", updateError);
// don’t fail the webhook – the insert succeeded
return res
.status(200)
.send("Inserted; profile flag update failed (will retry manually)");
}

console.log("✅ Insert OK + profiles.assessment_taken updated");
return res.status(200).send("OK");
} catch (err) {
console.error("💥 Uncaught webhook error:", err);
return res.status(500).send("Server error");
}
}
);

// (optional) other JSON routes can be added **after** the raw route
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => res.send("ok"));

// ---- start
app.listen(PORT, () => {
console.log(`🚀 Webhook listening on :${PORT}`);
});
