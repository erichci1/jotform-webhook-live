// server.js (only the route changes)

const qs = require("querystring");

// This route will accept JSON, urlencoded or multipart and normalize into `data`
app.post("/", express.raw({ type: "*/*" }), async (req, res) => {
try {
let data = {};
let text = "";

// ----- 1) try existing parsers (a reverse proxy or earlier middleware might have filled it)
if (req.body && typeof req.body === "object" && Object.keys(req.body).length) {
data = req.body;
} else {
// ----- 2) get raw string
text = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "");

// if Content-Type JSON or looks like JSON → parse JSON
const ct = (req.headers["content-type"] || "").toLowerCase();
if (ct.includes("application/json") || (text.startsWith("{") && text.endsWith("}"))) {
try { data = JSON.parse(text); } catch (_) {}
}

// otherwise parse urlencoded
if (!Object.keys(data).length && text.includes("=")) {
data = qs.parse(text);
}

// legacy: Jotform sometimes nests JSON inside `rawRequest`
if (!Object.keys(data).length && typeof data?.rawRequest === "string") {
try { data = JSON.parse(data.rawRequest); } catch (_) {}
if (typeof data === "string") { try { data = JSON.parse(data); } catch (_) {} }
}
}

console.log("📥 parsed keys:", Object.keys(data));

// ---- map your fields
const email = data.q12_q12_email || data.email || null;
const user_id = data.q189_q189_user_id || data.user_id || null;

// normalize percentages: accept '64%' or '64' or 64
const pct = v =>
v == null ? null :
typeof v === "number" ? v :
typeof v === "string" ? Number(String(v).replace('%','').trim()) :
null;

const payload = {
user_id,
email,
submission_date: new Date().toISOString(),

activate_percentage : pct(data.q187_activate_percentage),
activate_category : data.q134_activate_category || null,
activate_wtm : data.q155_activate_insight || null,
activate_yns : data.q177_activate_yns || null,

build_percentage : pct(data.q129_build_percentage),
build_category : data.q136_build_category || null,
build_wtm : data.q156_build_insight || null,
build_yns : data.q178_build_yns || null,

leverage_percentage : pct(data.q130_leverage_percentage),
leverage_category : data.q137_leverage_category || null,
leverage_wtm : data.q157_leverage_insight || null,
leverage_yns : data.q179_leverage_yns || null,

execute_percentage : pct(data.q186_execute_percentage),
execute_category : data.q138_execute_category || null,
execute_wtm : data.q158_execute_insight || null,
execute_yns : data.q180_execute_yns || null,

final_percentage : pct(data.q133_final_percentage),
final_summary_wtm : data.q159_final_summary_insight || null,
final_summary_yns : data.q188_final_summary_yns || null,
};

if (!user_id || !email) {
console.warn("⚠️ Missing user_id or email", { user_id, email, sample: data });
return res.status(400).send("Missing user_id or email");
}

console.log("📤 inserting payload:", payload);

const { error: insertError } = await supabase
.from("assessment_results_2")
.insert([payload]);

if (insertError) {
console.error("❌ Supabase insert error:", insertError);
return res.status(500).send("Insert failed");
}

const { error: updateError } = await supabase
.from("profiles")
.update({ assessment_taken: true })
.eq("id", user_id);

if (updateError) {
console.warn("⚠️ profiles update failed:", updateError);
// don’t fail the whole webhook — Jotform will retry on non-200s
}

console.log("✅ OK");
return res.status(200).send("OK");
} catch (err) {
console.error("💥 webhook handler error", err);
return res.status(500).send("Server error");
}
});

