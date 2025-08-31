require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const PORT = process.env.PORT || 3000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
console.error("🚨 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
process.exit(1);
}

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();

// We will parse multipart at the route level with multer:
const upload = multer({ limits: { fieldSize: 50 * 1024 * 1024 } }); // generous

// Optional parsers for other routes; they do not affect the multer route.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------- helpers -----------------
const toNumber = (v) => {
if (v === null || v === undefined) return null;
if (typeof v === "number") return v;
const s = String(v).trim();
if (s === "") return null;
const n = parseFloat(s.replace(/%/g, ""));
return Number.isFinite(n) ? n : null;
};

// ----------------- webhook -----------------
app.post("/", upload.any(), async (req, res) => {
try {
const ct = req.headers["content-type"] || "";
console.log("🧾 Content-Type:", ct);
console.log("🗂 multer fields:", Object.keys(req.body || {}));

let data = req.body || {};

// Some Jotform setups also add a JSON string called rawRequest – parse it if present.
if (typeof data.rawRequest === "string") {
try {
const parsed = JSON.parse(data.rawRequest);
data = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
console.log("✅ parsed rawRequest into object");
} catch (e) {
console.warn("⚠️ rawRequest parse failed:", e?.message);
}
}

// Map fields (adjust if your form keys change)
const email =
data.q12_q12_email ?? data.q12_email ?? data.email ?? null;
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

console.log("🧩 payload:", payload);

if (!payload.user_id || !payload.email) {
console.warn("⚠️ Missing user_id/email", {
user_id: payload.user_id,
email: payload.email,
});
return res.status(400).send("Missing user_id or email");
}

const { error: insertError } = await supabase
.from("assessment_results_2")
.insert([payload]);

if (insertError) {
console.error("❌ Insert error:", insertError);
return res.status(500).send("Insert failed");
}

const { error: updateError } = await supabase
.from("profiles")
.update({ assessment_taken: true })
.eq("id", payload.user_id);

if (updateError) {
console.error("⚠️ Profile flag update failed:", updateError);
return res
.status(200)
.send("Inserted; profile update failed (manual retry)");
}

console.log("✅ Insert OK + profiles.assessment_taken updated");
return res.status(200).send("OK");
} catch (err) {
console.error("💥 Uncaught webhook error:", err);
return res.status(500).send("Server error");
}
});

app.get("/health", (_req, res) => res.send("ok"));

app.listen(PORT, () => console.log(`🚀 Webhook listening on :${PORT}`));