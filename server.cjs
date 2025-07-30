// server.cjs
require("dotenv").config();

const express    = require("express");
const multer     = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// parse multipart/form‑data (JotForm always posts as multipart)
app.use(multer().none());

// also allow JSON / urlencoded for curl‐tests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// supabase client
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("🚨 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/", async (req, res) => {
  console.log("––––––––––––––––––––––––––––––––––––");
  console.log("📥 Received payload:", req.body);

  // if JotForm wrapped everything in rawRequest, parse it:
  let data = {};
  if (req.body.rawRequest) {
    try {
      data = JSON.parse(req.body.rawRequest);
    } catch (err) {
      console.error("❌ rawRequest parse error:", err);
      return res.status(400).send("Bad rawRequest");
    }
  } else {
    // otherwise assume top‑level fields
    data = req.body;
  }

  // now pull your two critical fields:
  const user_id = data.q189_user_id;
  const email   = data.q12_email;

  if (!user_id || !email) {
    console.warn("⚠️ Missing user_id or email:", { user_id, email });
    return res.status(400).send("Missing user_id or email");
  }

  // build the rest of your payload
  const payload = {
    user_id,
    submission_date:     new Date().toISOString(),
    name:                `${data.q11_first || ""} ${data.q11_last || ""}`.trim(),
    email,
    activate_percentage: data.q118_activate_percentage || "",
    activate_category:   data.q119_activate_category   || "",
    activate_wtm:        data.q120_activate_wtm        || "",
    activate_yns:        data.q121_activate_yns        || "",
    build_percentage:    data.q122_build_percentage    || "",
    build_category:      data.q123_build_category      || "",
    build_wtm:           data.q124_build_wtm           || "",
    build_yns:           data.q125_build_yns           || "",
    leverage_percentage: data.q126_leverage_percentage || "",
    leverage_category:   data.q127_leverage_category   || "",
    leverage_wtm:        data.q128_leverage_wtm        || "",
    leverage_yns:        data.q129_leverage_yns        || "",
    execute_percentage:  data.q130_execute_percentage  || "",
    execute_category:    data.q131_execute_category    || "",
    execute_wtm:         data.q132_execute_wtm         || "",
    execute_yns:         data.q133_execute_yns         || "",
    final_percentage:    data.q134_final_percentage    || "",
    final_summary_wtm:   data.q135_final_summary_wtm   || "",
    final_summary_yns:   data.q136_final_summary_yns   || ""
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
