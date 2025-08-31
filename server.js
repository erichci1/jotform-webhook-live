// server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

/* ------------------------------- Supabase ------------------------------ */
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
console.error("🚨 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
process.exit(1);
}

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY,
{ auth: { persistSession: false } }
);

/* ------------------------------- Middleware ---------------------------- */
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

/* ------------------------------- Helpers -------------------------------- */
// parse '64%' or '64.19' or '64' → number | null
function toPct(v) {
if (v == null) return null;
if (typeof v === "number") return isFinite(v) ? v : null;
const s = String(v).trim().replace("%", "");
const n = parseFloat(s);
return isFinite(n) ? n : null;
}

function valOf(obj, keys) {
for (const k of keys) {
const v = obj[k];
if (v !== undefined && v !== null && String(v).trim() !== "") return v;
}
return null;
}

/* -------------------------------- Webhook ------------------------------- */
app.post("/", async (req, res) => {
try {
console.log("📥 raw body keys:", Object.keys(req.body));

// JotForm sometimes sends rawRequest as JSON string-within-string
let data = req.body;
if (typeof req.body.rawRequest === "string") {
try {
data = JSON.parse(req.body.rawRequest);
if (typeof data === "string") data = JSON.parse(data);
} catch (e) {
console.error("❌ rawRequest parse error:", e);
return res.status(400).send("Bad rawRequest payload");
}
}

console.log("📥 parsed keys:", Object.keys(data));

/* ----- pull user + email from multiple possible keys ----- */
const user_id = valOf(data, ["q189_q189_user_id", "user_id"]);
const email = valOf(data, ["q12_q12_email", "email"]);

if (!user_id || !email) {
console.warn("⚠️ Missing user_id/email", { user_id, email });
return res.status(400).send("Missing user_id or email");
}

/* ----- sanitize percentages to numeric ----- */
const payload = {
user_id,
email,
submission_date: new Date().toISOString(),

activate_percentage: toPct(valOf(data, ["q187_activate_percentage"])),
activate_category: valOf(data, ["q134_activate_category"]),
activate_wtm: valOf(data, ["q155_activate_insight"]),
activate_yns: valOf(data, ["q177_activate_yns"]),

build_percentage: toPct(valOf(data, ["q129_build_percentage"])),
build_category: valOf(data, ["q136_build_category"]),
build_wtm: valOf(data, ["q156_build_insight"]),
build_yns: valOf(data, ["q178_build_yns"]),

leverage_percentage: toPct(valOf(data, ["q130_leverage_percentage"])),
leverage_category: valOf(data, ["q137_leverage_category"]),
leverage_wtm: valOf(data, ["q157_leverage_insight"]),
leverage_yns: valOf(data, ["q179_leverage_yns"]),

execute_percentage: toPct(valOf(data, ["q186_execute_percentage"])),
execute_category: valOf(data, ["q138_execute_category"]),
execute_wtm: valOf(data, ["q158_execute_insight"])),
execute_yns: valOf(data, ["q180_execute_yns"]),

final_percentage: toPct(valOf(data, ["q133_final_percentage"])),
final_summary_wtm: valOf(data, ["q159_final_summary_insight"]),
final_summary_yns: valOf(data, ["q188_final_summary_yns"]),
};

console.log("📤 inserting:", payload);

const { error: insertError } = await supabase
.from("assessment_results_2")
.insert([payload]);

if (insertError) {
console.error("❌ insert error:", insertError);
return res.status(500).send("Insert failed");
}

// Flip profile flag so UI shows donuts without a page refresh
const { error: updateError } = await supabase
.from("profiles")
.update({ assessment_taken: true })
.eq("id", user_id);

if (updateError) {
console.warn("⚠️ profile update failed:", updateError);
// still return OK; the data is saved — UI can recover on next fetch
}

console.log("✅ webhook OK");
res.status(200).send("OK");
} catch (err) {
console.error("❌ webhook exception:", err);
res.status(500).send("Server error");
}
});

/* -------------------------------- Listen -------------------------------- */
app.listen(PORT, () => {
console.log(`🚀 Webhook listening on ${PORT}`);
});
