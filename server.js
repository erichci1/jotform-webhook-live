// server.js
require("dotenv").config();

const express = require("express");
const multer  = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app  = express();
const PORT = process.env.PORT || 3000;
const upload = multer().none();

// 1) Init Supabase with a service-role key
if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error("🚨 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 2) Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3) Webhook endpoint
app.post("/", upload, async (req, res) => {
  // A) Debug: what came in?
  console.log("📥 Raw req.body keys:", Object.keys(req.body));

  // B) If JotForm wrapped everything in rawRequest, peel it off
  let data = req.body;
  if (typeof req.body.rawRequest === "string") {
    try {
      data = JSON.parse(req.body.rawRequest);
      if (typeof data === "string") data = JSON.parse(data);
    } catch (err) {
      console.error("❌ rawRequest parse error:", err);
      return res.status(400).send("Bad rawRequest payload");
    }
  }

  // C) Now log the parsed keys
  console.log("📥 Parsed data keys:", Object.keys(data));

  // D) Pull out the discrete fields you need:
  const email               = data.q12_email;
  const activate_percentage = data.q118_activate_percentage || "";
  const activate_category   = data.q119_activate_category   || "";
  const activate_wtm        = data.q120_activate_wtm        || "";
  const activate_yns        = data.q121_activate_yns        || "";
  const build_percentage    = data.q122_build_percentage    || "";
  const build_category      = data.q123_build_category      || "";
  const build_wtm           = data.q124_build_wtm           || "";
  const build_yns           = data.q125_build_yns           || "";
  const leverage_percentage = data.q126_leverage_percentage || "";
  const leverage_category   = data.q127_leverage_category   || "";
  const leverage_wtm        = data.q128_leverage_wtm        || "";
  const leverage_yns        = data.q129_leverage_yns        || "";
  const execute_percentage  = data.q130_execute_percentage  || "";
  const execute_category    = data.q131_execute_category    || "";
  const execute_wtm         = data.q132_execute_wtm         || "";
  const execute_yns         = data.q133_execute_yns         || "";
  const final_percentage    = data.q134_final_percentage    || "";
  const final_summary_wtm   = data.q135_final_summary_wtm   || "";
  const final_summary_yns   = data.q136_final_summary_yns   || "";

  // E) Basic validation
  if (!email) {
    console.warn("⚠️ Missing email:", { email });
    return res.status(400).send("Missing email");
  }

  // F) Lookup the Supabase user_id from the email
  const { data: userRecord, error: lookupError } = await supabase
    .from("users")             // service-role key lets you query the auth.users view
    .select("id")
    .eq("email", email)
    .single();

  if (lookupError || !userRecord) {
    console.error("❌ Could not find user for email:", email, lookupError);
    return res.status(404).send("User not found");
  }
  const user_id = userRecord.id;

  // G) Build the row
  const payload = {
    user_id,
    email,
    submission_date:     new Date().toISOString(),
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
  };

  console.log("📤 Inserting payload:", payload);

  // H) Insert into your table
  const { error: insertError } = await supabase
    .from("assessment_results_2")
    .insert([payload]);

  if (insertError) {
    console.error("❌ Supabase insert error:", insertError);
    return res.status(500).send("Insert failed");
  }

  console.log("✅ Insert succeeded");
  return res.send("OK");
});

// 4) Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
});
