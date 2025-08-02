// server.js
require("dotenv").config();

const express = require("express");
const multer  = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app  = express();
const PORT = process.env.PORT || 3000;
const upload = multer().none();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("🚨 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/", upload, async (req, res) => {
  console.log("📥 Raw req.body keys:", Object.keys(req.body));

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

  // ← FIXED field names here ←
  const email               = data.q12_q12_email;
  const user_id             = data.q189_q189_user_id;

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

  if (!user_id || !email) {
    console.warn("⚠️ Missing user_id or email:", { user_id, email });
    return res.status(400).send("Missing user_id or email");
  }

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

app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
});
