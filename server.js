// server.js
require("dotenv").config();

const express    = require("express");
const bodyParser = require("body-parser");
const multer     = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app  = express();
const port = process.env.PORT || 3000;

// parse JSON, form‑encoded, and multipart "none"
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer().none());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/", async (req, res) => {
  try {
    console.log("📥 Received payload:", req.body);

    // JotForm field → local var
    const {
      q189_user_id: user_id,
      q12_email:    email,
      q11_Name:     rawName,
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

    // reconstruct name from JotForm's Name widget
    let name = "";
    if (rawName && typeof rawName === "object") {
      name = `${rawName.first||""} ${rawName.last||""}`.trim();
    }

    if (!user_id || !email) {
      console.warn("⚠️ Missing user_id or email:", { user_id, email });
      return res.status(400).send("Missing user_id or email");
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

    const { error } = await supabase
      .from("assessment_results_2")
      .insert([payload]);

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).send("Insert failed");
    }

    console.log("✅ Inserted:", payload);
    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`);
});
