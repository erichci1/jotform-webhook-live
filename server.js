// server.js
require("dotenv").config();

const express = require("express");
const multer  = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app  = express();
const PORT = process.env.PORT || 3000;
const upload = multer().none();

// 1) Initialize Supabase
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

// 2) Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3) Webhook endpoint
app.post("/", upload, async (req, res) => {
  console.log("📥 Raw req.body keys:", Object.keys(req.body));

  // 3a) Parse JotForm's rawRequest if present
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

  console.log("📥 Parsed data keys:", Object.keys(data));

  // 3b) Discrete field mappings (using the exact qXXX keys from your logs)
  const email               = data.q12_q12_email;
  const user_id             = data.q189_q189_user_id;

  const activate_percentage = data.q187_activate_percentage || "";
  const activate_category   = data.q134_activate_category   || "";
  const activate_wtm        = data.q155_activate_insight    || "";
  const activate_yns        = data.q177_activate_yns        || "";

  const build_percentage    = data.q129_build_percentage    || "";
  const build_category      = data.q136_build_category      || "";
  const build_wtm           = data.q156_build_insight       || "";
  const build_yns           = data.q178_build_yns           || "";

  const leverage_percentage = data.q130_leverage_percentage || "";
  const leverage_category   = data.q137_leverage_category   || "";
  const leverage_wtm        = data.q157_leverage_insight    || "";
  const leverage_yns        = data.q179_leverage_yns        || "";

  const execute_percentage  = data.q186_execute_percentage  || "";
  const execute_category    = data.q138_execute_category    || "";
  const execute_wtm         = data.q158_execute_insight     || "";
  const execute_yns         = data.q180_execute_yns         || "";

  const final_percentage    = data.q133_final_percentage    || "";
  const final_summary_wtm   = data.q159_final_summary_insight || "";
  const final_summary_yns   = data.q188_final_summary_yns    || "";

  // 3c) Validate required
  if (!user_id || !email) {
    console.warn("⚠️ Missing user_id or email:", { user_id, email });
    return res.status(400).send("Missing user_id or email");
  }

  // 3d) Build payload
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

  // 3e) Insert into Supabase
  const { error } = await supabase
    .from("assessment_results_2")
    .insert([payload]);

  if (error) {
    console.error("❌ Supabase insert error:", error);
    return res.status(500).send("Insert failed");
  }

  console.log("✅ Insert succeeded");
  res.send("OK");
});

// 4) Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
});
