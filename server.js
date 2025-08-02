// server.js
require("dotenv").config();

const express = require("express");
const multer  = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app  = express();
const PORT = process.env.PORT || 3000;

// 1) Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2) Multer for any form-data
const upload = multer().none();

// 3) Supabase client
if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error(
    "🚨 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  );
  process.exit(1);
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 4) Webhook endpoint
app.post("/", upload, async (req, res) => {
  console.log("–––– Received body keys:", Object.keys(req.body));
  console.log("–––– Full body payload:", req.body);

  // 4a) Grab your discrete fields:
  const user_id             = req.body.q189_user_id;
  const email               = req.body.q12_email;
  const activate_percentage = req.body.q118_activate_percentage || "";
  const activate_category   = req.body.q119_activate_category   || "";
  const activate_wtm        = req.body.q120_activate_wtm        || "";
  const activate_yns        = req.body.q121_activate_yns        || "";
  const build_percentage    = req.body.q122_build_percentage    || "";
  const build_category      = req.body.q123_build_category      || "";
  const build_wtm           = req.body.q124_build_wtm           || "";
  const build_yns           = req.body.q125_build_yns           || "";
  const leverage_percentage = req.body.q126_leverage_percentage || "";
  const leverage_category   = req.body.q127_leverage_category   || "";
  const leverage_wtm        = req.body.q128_leverage_wtm        || "";
  const leverage_yns        = req.body.q129_leverage_yns        || "";
  const execute_percentage  = req.body.q130_execute_percentage  || "";
  const execute_category    = req.body.q131_execute_category    || "";
  const execute_wtm         = req.body.q132_execute_wtm         || "";
  const execute_yns         = req.body.q133_execute_yns         || "";
  const final_percentage    = req.body.q134_final_percentage    || "";
  const final_summary_wtm   = req.body.q135_final_summary_wtm   || "";
  const final_summary_yns   = req.body.q136_final_summary_yns   || "";

  // 4b) Validate required
  if (!user_id || !email) {
    console.warn("⚠️ Missing user_id or email:", { user_id, email });
    return res.status(400).send("Missing user_id or email");
  }

  // 4c) Build payload
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

  // 4d) Insert to Supabase
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

// 5) Launch
app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
});
