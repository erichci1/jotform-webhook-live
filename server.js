// server.js
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 3000;

// --- Env guard ---
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
console.error("🚨 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
process.exit(1);
}

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();

// Only parse multipart on the webhook route (multer); keep others light
const upload = multer({ limits: { fieldSize: 50 * 1024 * 1024 } });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------- helpers -----------------
const toNumber = (v) => {
if (v === null || v === undefined) return null;
if (typeof v === "number") return Number.isFinite(v) ? v : null;
const s = String(v).trim();
if (!s) return null;
const n = parseFloat(s.replace(/%/g, ""));
return Number.isFinite(n) ? n : null;
};
const strOrNull = (v) => {
if (v === undefined || v === null) return null;
const s = String(v).trim();
return s ? s : null;
};
const nowISO = () => new Date().toISOString();

/** Resolve a value from outer payload first, then raw (if provided). */
function pickKey(outer, raw, key) {
if (outer && Object.prototype.hasOwnProperty.call(outer, key)) return outer[key];
if (raw && Object.prototype.hasOwnProperty.call(raw, key)) return raw[key];
return null;
}

/** Pull submission id from both layers without overwriting the body. */
function resolveSubmissionId(outer, raw) {
let sid =
pickKey(outer, raw, "submission_id") ||
pickKey(outer, raw, "submissionID") ||
pickKey(outer, raw, "id") ||
null;

if (!sid) {
sid = `srv_${randomUUID()}`;
console.log("ℹ️ submission_id not provided; generated:", sid);
} else {
console.log("✅ submission_id detected:", sid);
}
return sid;
}

// ----------------- webhook -----------------
app.post("/", upload.any(), async (req, res) => {
try {
const ct = req.headers["content-type"] || "";
console.log("🧾 Content-Type:", ct);
console.log("🗂 multer fields:", Object.keys(req.body || {}));

// Keep the original outer body intact
const outer = req.body || {};

// Parse rawRequest separately (do NOT overwrite outer)
let raw = null;
if (typeof outer.rawRequest === "string") {
try {
const parsed = JSON.parse(outer.rawRequest);
raw = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
console.log("✅ parsed rawRequest into object");
} catch (e) {
console.warn("⚠️ rawRequest parse failed:", e?.message);
}
}

// --- Resolve submission_id across both layers ---
let submission_id =
outer.submissionID || // Jotform outer body field
outer.submission_id ||
outer.id ||
(raw && (raw.submissionID || raw.submission_id || raw.id)) ||
null;

if (!submission_id) {
submission_id = `srv_${require("crypto").randomUUID()}`;
console.log("ℹ️ submission_id not provided; generated:", submission_id);
} else {
console.log("✅ submission_id detected:", submission_id);
}

// --- Identity (prefer outer; fallback to raw) ---
const email =
pickKey(outer, raw, "q12_q12_email") ??
pickKey(outer, raw, "q12_email") ??
pickKey(outer, raw, "email") ??
null;

const user_id =
pickKey(outer, raw, "q189_q189_user_id") ??
pickKey(outer, raw, "user_id") ??
null;

if (!user_id || !email) {
console.warn("⚠️ Missing user_id/email", { user_id, email });
return res.status(400).send("Missing user_id or email");
}

// --- Map assessment fields (outer first, then raw) ---
const row = {
submission_id,
user_id,
email,
submission_date: nowISO(),
created_at: nowISO(),

activate_percentage: toNumber(pickKey(outer, raw, "q187_activate_percentage")),
activate_category: strOrNull(pickKey(outer, raw, "q134_activate_category")),
activate_wtm: strOrNull(pickKey(outer, raw, "q155_activate_insight")),
activate_yns: strOrNull(pickKey(outer, raw, "q177_activate_yns")),

build_percentage: toNumber(pickKey(outer, raw, "q129_build_percentage")),
build_category: strOrNull(pickKey(outer, raw, "q136_build_category")),
build_wtm: strOrNull(pickKey(outer, raw, "q156_build_insight")),
build_yns: strOrNull(pickKey(outer, raw, "q178_build_yns")),

leverage_percentage: toNumber(pickKey(outer, raw, "q130_leverage_percentage")),
leverage_category: strOrNull(pickKey(outer, raw, "q137_leverage_category")),
leverage_wtm: strOrNull(pickKey(outer, raw, "q157_leverage_insight")),
leverage_yns: strOrNull(pickKey(outer, raw, "q179_leverage_yns")),

execute_percentage: toNumber(pickKey(outer, raw, "q186_execute_percentage")),
execute_category: strOrNull(pickKey(outer, raw, "q138_execute_category")),
execute_wtm: strOrNull(pickKey(outer, raw, "q158_execute_insight")),
execute_yns: strOrNull(pickKey(outer, raw, "q180_execute_yns")),

final_percentage: toNumber(pickKey(outer, raw, "q133_final_percentage")),
final_summary_wtm: strOrNull(pickKey(outer, raw, "q159_final_summary_insight")),
final_summary_yns: strOrNull(pickKey(outer, raw, "q188_final_summary_yns")),
};

console.log("🧩 payload (with submission_id):", {
submission_id: row.submission_id,
user_id: row.user_id,
email: row.email,
final_percentage: row.final_percentage,
});

// --- 1) Idempotent write on submission_id ---
// Requires: unique index on assessment_results_2(submission_id)
const insert = await supabase
.from("assessment_results_2")
.upsert(row, { onConflict: "submission_id", ignoreDuplicates: true })
.select("submission_id")
.single();

if (insert.error && insert.error.code !== "23505") {
console.error("❌ Insert error:", insert.error);
return res.status(500).send("Insert failed");
}

// --- 2) Snapshot for fast dashboard reads ---
const ap = row.activate_percentage ?? 0;
const bp = row.build_percentage ?? 0;
const lp = row.leverage_percentage ?? 0;
const ep = row.execute_percentage ?? 0;

const hasAny = [ap, bp, lp, ep].some((n) => (n ?? 0) > 0);
const score_overall = hasAny ? Number(((ap + bp + lp + ep) / 4).toFixed(2)) : null;
const domains = hasAny
? {
activate: row.activate_percentage ?? null,
build: row.build_percentage ?? null,
leverage: row.leverage_percentage ?? null,
execute: row.execute_percentage ?? null,
}
: null;

const up = await supabase
.from("assessment_profile")
.upsert(
{
user_id: row.user_id,
last_submission_id: row.submission_id,
score_overall,
domains,
updated_at: nowISO(),
},
{ onConflict: "user_id" }
);

if (up.error) {
console.warn("⚠️ assessment_profile upsert failed:", up.error);
// not fatal
}

// --- 3) Optional: mark profile flag ---
const flag = await supabase
.from("profiles")
.update({ assessment_taken: true, updated_at: nowISO() })
.eq("id", row.user_id);

if (flag.error) {
console.warn("⚠️ profiles.assessment_taken update failed:", flag.error);
return res.status(200).send("Inserted; profile update failed");
}

console.log("✅ Insert/Upsert OK + profiles.assessment_taken updated");
return res.status(200).send("OK");
} catch (err) {
console.error("💥 Uncaught webhook error:", err);
return res.status(500).send("Server error");
}
});

// Health probe
app.get("/health", (_req, res) => res.status(200).send("ok"));

app.listen(PORT, () => {
console.log(`🚀 Webhook listening on :${PORT}`);
});