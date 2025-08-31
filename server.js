// server.js ------------------------------------------------------------
// Webhook to insert assessment rows into public.assessment_results_2
// - Sanitizes percent strings (e.g. "64%")
// - Accepts either JotForm keys or your raw keys
//-----------------------------------------------------------------------
require("dotenv").config()

const express = require("express")
const cors = require("cors")
const multer = require("multer")
const { createClient } = require("@supabase/supabase-js")

const app = express()
const PORT = process.env.PORT || 3000
const upload = multer().none()

// 0) Supabase (service role)
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
console.error("🚨 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
process.exit(1)
}
const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY,
{ auth: { persistSession: false } }
)

// 1) Middleware
app.use(cors())
app.use(express.json({ limit: "2mb" }))
app.use(express.urlencoded({ extended: true, limit: "2mb" }))

// 2) Helpers ------------------------------------------------------------
// (a) choose first non-empty value from candidate keys
const valOf = (obj, keys) => {
for (const k of keys) {
const v = obj?.[k]
if (v !== undefined && v !== null && String(v).trim() !== "") return v
}
return null
}
// (b) "64%" => 64 ; "64.5" => 64.5 ; "N/A" => null
const toPct = (v) => {
if (v === null || v === undefined) return null
const m = String(v).match(/-?\d+(\.\d+)?/)
return m ? Number(m[0]) : null
}

// 3) Webhook endpoint ---------------------------------------------------
app.post("/", upload, async (req, res) => {
try {
console.log("📥 Raw req.body keys:", Object.keys(req.body))

// JotForm sometimes sends JSON as a string under rawRequest
let data = req.body
if (typeof req.body.rawRequest === "string") {
try {
data = JSON.parse(req.body.rawRequest)
if (typeof data === "string") data = JSON.parse(data)
} catch (err) {
console.error("❌ rawRequest parse error:", err)
return res.status(400).send("Bad rawRequest payload")
}
}

console.log("📥 Parsed data keys:", Object.keys(data))

// Required
const user_id = valOf(data, ["q189_q189_user_id", "user_id", "uid", "userId"])
const email = valOf(data, ["q12_q12_email", "email", "user_email", "q12_email"])

if (!user_id || !email) {
console.warn("⚠️ Missing user_id or email:", { user_id, email })
return res.status(400).send("Missing user_id or email")
}

// Percent fields (numeric columns in Supabase)
const activate_percentage = toPct(
valOf(data, ["q187_activate_percentage", "activate_percentage", "activate_pct"])
)
const build_percentage = toPct(
valOf(data, ["q129_build_percentage", "build_percentage", "build_pct"])
)
const leverage_percentage = toPct(
valOf(data, ["q130_leverage_percentage", "leverage_percentage", "leverage_pct"])
)
const execute_percentage = toPct(
valOf(data, ["q186_execute_percentage", "execute_percentage", "execute_pct"])
)
const final_percentage = toPct(
valOf(data, ["q133_final_percentage", "final_percentage", "final_pct"])
)

// Text guidance
const activate_wtm = valOf(data, ["activate_wtm", "q155_activate_insight"])
const activate_yns = valOf(data, ["activate_yns", "q177_activate_yns"])
const build_wtm = valOf(data, ["build_wtm", "q156_build_insight"])
const build_yns = valOf(data, ["build_yns", "q178_build_yns"])
const leverage_wtm = valOf(data, ["leverage_wtm", "q157_leverage_insight"])
const leverage_yns = valOf(data, ["leverage_yns", "q179_leverage_yns"])
const execute_wtm = valOf(data, ["execute_wtm", "q158_execute_insight"])
const execute_yns = valOf(data, ["execute_yns", "q180_execute_yns"])

const activate_category = valOf(data, ["activate_category", "q134_activate_category"])
const build_category = valOf(data, ["build_category", "q136_build_category"])
const leverage_category = valOf(data, ["leverage_category", "q137_leverage_category"])
const execute_category = valOf(data, ["execute_category", "q138_execute_category"])

const final_summary_wtm = valOf(data, ["final_summary_wtm", "q159_final_summary_insight"])
const final_summary_yns = valOf(data, ["final_summary_yns", "q188_final_summary_yns"])

const submission_date =
valOf(data, ["submission_date", "submitDate", "created_at"]) ||
new Date().toISOString()

// Build payload
const payload = {
user_id,
email,
submission_date,

activate_percentage,
activate_category,
activate_wtm,
activate_yns,

build_percentage,
build_category,
build_wtm,
build_yns,

leverage_percentage,
leverage_category,
leverage_wtm,
leverage_yns,

execute_percentage,
execute_category,
execute_wtm,
execute_yns,

final_percentage,
final_summary_wtm,
final_summary_yns,
}

console.log("📤 Inserting row:", payload)

const { error: insertError } = await supabase
.from("assessment_results_2")
.insert([payload])

if (insertError) {
console.error("❌ Supabase insert error:", insertError)
return res.status(500).send("Insert failed")
}

// Optional profile flag
const { error: updateError } = await supabase
.from("profiles")
.update({ assessment_taken: true })
.eq("id", user_id)

if (updateError) {
console.warn("⚠️ Profile update failed:", updateError)
// Do not fail the whole request if the row was inserted.
}

console.log("✅ Insert OK (assessment_taken updated)")
return res.status(200).send("OK")
} catch (err) {
console.error("❌ Webhook error:", err)
return res.status(500).send("Server error")
}
})

// 4) Start server
app.listen(PORT, () => {
console.log(`🚀 Webhook listening on ${PORT}`)
})
