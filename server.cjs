// server.cjs
require("dotenv").config();

const express    = require("express");
const multer     = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// Multer will parse multipart/form‑data bodies into req.body
app.use(multer().none());

// You can still support JSON / URL‑encoded (in case you want to test with curl)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//––– Supabase
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("🚨 Missing SUPABASE_* env vars");
  process.exit(1);
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/", async (req, res) => {
  console.log("––––––––––––––––––––––––––––––––––––");
  console.log("📥 Received payload:", req.body);

  // pull the form fields directly off req.body
  const {
    q189_user_id:              user_id,
    q12_email:                 email,
    q11_Name:                  nameObj,
    q118_activate_percentage,
    q119_activate_category,
    q120_activate_wtm,
    q121_activate_yns,
    q122_build_percentage,
    q123_build_category,
    q124_build_wtm,
    q125_build_yns,
    q126_leverage_percentage,
    q127_leverage_category,
    q128_leverage_wtm,
    q129_leverage_yns,
    q130_execute_percentage,
    q131_execute_category,
    q132_execute_wtm,
    q133_execute_yns,
    q134_final_percentage,
    q135_final_summary_wtm,
    q136_final_summary_yns
  } = req.body;

  // basic validation
  if (!user_id || !email) {
    console.warn("⚠️ Missing user_id or email:", { user_id, email });
    return res.status(400).send("Missing user_id or email");
  }

  // build a flat name if your Name field is an object
  let name = "";
  if (nameObj && (nameObj.first || nameObj.last)) {
    name = `${nameObj.first || ""} ${nameObj.last || ""}`.trim();
  }

  const payload = {
    user_id,
    submission_date: new Date().toISOString(),
    name,
    email,
    activate_percentage:  q118_activate_percentage  || "",
    activate_category:    q119_activate_category    || "",
    activate_wtm:         q120_activate_wtm         || "",
    activate_yns:         q121_activate_yns         || "",
    build_percentage:     q122_build_percentage     || "",
    build_category:       q123_build_category       || "",
    build_wtm:            q124_build_wtm            || "",
    build_yns:            q125_build_yns            || "",
    leverage_percentage:  q126_leverage_percentage  || "",
    leverage_category:    q127_leverage_category    || "",
    leverage_wtm:         q128_leverage_wtm         || "",
    leverage_yns:         q129_leverage_yns         || "",
    execute_percentage:   q130_execute_percentage   || "",
    execute_category:     q131_execute_category     || "",
    execute_wtm:          q132_execute_wtm          || "",
    execute_yns:          q133_execute_yns          || "",
    final_percentage:     q134_final_percentage     || "",
    final_summary_wtm:    q135_final_summary_wtm    || "",
    final_summary_yns:    q136_final_summary_yns    || ""
  };

  console.log("📤 Inserting into assessment_results_2:", payload);
  const { error } = await supabase
    .from("assessment_results_2")
    .insert([payload]);

  if (error) {
    console.error("❌ Supabase insert error:", error);
    return res.status(500).send("Insert failed");
  }

  console.log("✅ Insert succeeded");
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook listening on port ${PORT}`);
});
