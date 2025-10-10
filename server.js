// server.js
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 3000;

// --- env guard ---
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
console.error("🚨 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
process.exit(1);
}

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();

// Parse multipart only on routes that need it
const upload = multer({ limits: { fieldSize: 50 * 1024 * 1024 } });

// Optional parsers for other routes
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

/**
* Pull a submission id from a messy Jotform payload (outer body + parsed rawRequest)
*/
function getSubmissionId(data) {
// try outer fields
let sid =
data.submission_id ||
data.submissionID ||
data.id ||
null;

// try nested rawRequest object if still missing
const raw = data && typeof data.rawRequest === "object" ? data.rawRequest : null;
if (!sid && raw) {
sid =
raw.submission_id ||
raw.submissionID ||
raw.id ||
null;
}

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

let data = req.body || {};

// Some Jotform setups add a JSON string called rawRequest – parse it if present.
if (typeof data.rawRequest === "string") {
try {
const parsed = JSON.parse(data.rawRequest);
data = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
console.log("✅ parsed rawRequest into object");
} catch (e) {
console.warn("⚠️ rawRequest parse failed:", e?.message);
}
}

// --- IDs & identity
const submission_id = getSubmissionId(data);

const email =
data.q12_q12_email ?? data.q12_email ?? data.email ?? null;

const user_id = data.q189_q189_user_id ?? data.user_id ?? null;

if (!user_id || !email) {
console.warn("⚠️ Missing user_id/email", { user_id, email });
return res.status(400).send("Missing user_id or email");
}

// --- Map fields (adjust if your form keys change)
const row = {
submission_id,
user_id,
email,
submission_date: nowISO(),
created_at: nowISO(),

activate_percentage: toNumber(data.q187_activate_percentage),
activate_category: strOrNull(data.q134_activate_category),
activate_wtm: strOrNull(data.q155_activate_insight),
activate_yns: strOrNull(data.q177_activate_yns),

build_percentage: toNumber(data.q129_build_percentage),
build_category: strOrNull(data.q136_build_category),
build_wtm: strOrNull(data.q156_build_insight),
build_yns: strOrNull(data.q178_build_yns),

leverage_percentage: toNumber(data.q130_leverage_percentage),
leverage_category: strOrNull(data.q137_leverage_category),
leverage_wtm: strOrNull(data.q157_leverage_insight),
leverage_yns: strOrNull(data.q179_leverage_yns),

execute_percentage: toNumber(data.q186_execute_percentage),
execute_category: strOrNull(data.q138_execute_category),
execute_wtm: strOrNull(data.q158_execute_insight),
execute_yns: strOrNull(data.q180_execute_yns),

final_percentage: toNumber(data.q133_final_percentage),
final_summary_wtm: strOrNull(data.q159_final_summary_insight),
final_summary_yns: strOrNull(data.q188_final_summary_yns),
};

console.log("🧩 payload (with submission_id):", {
submission_id: row.submission_id,
user_id: row.user_id,
email: row.email,
final_percentage: row.final_percentage,
});

// --- 1) idempotent insert on submission_id
const insert = await supabase
.from("assessment_results_2")
.upsert(row, { onConflict: "submission_id", ignoreDuplicates: true })
.select("submission_id")
.single();

if (insert.error && insert.error.code !== "23505") {
console.error("❌ Insert error:", insert.error);
return res.status(500).send("Insert failed");
}

// --- 2) snapshot for fast dashboard read
const ap = row.activate_percentage ?? 0;
const bp = row.build_percentage ?? 0;
const lp = row.leverage_percentage ?? 0;
const ep = row.execute_percentage ?? 0;

const hasAny = [ap, bp, lp, ep].some((n) => (n ?? 0) > 0);
const score_overall = hasAny
? Number(((ap + bp + lp + ep) / 4).toFixed(2))
: null;

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

// --- 3) optional: flag profile
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

// health probe
app.get("/health", (_req, res) => res.send("ok"));

app.listen(PORT, () => {
console.log(`🚀 Webhook listening on :${PORT}`);
});

