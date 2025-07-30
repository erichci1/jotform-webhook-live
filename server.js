// server.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config(); // loads SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY

const app = express();
const port = process.env.PORT || 10000;

// allow JSON + URL‑encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// supabase client with Service Role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/", async (req, res) => {
  try {
    console.log("📥 Received payload:", JSON.stringify(req.body, null, 2));

    // Pull fields straight off the top‑level body
    const {
      q11_Name: { first: first_name = "", last: last_name = "" } = {},
      q12_Email:        email       = "",
      q189_user_id:     user_id     = "",
      q118_activate_percentage       = "",
      q119_activate_category         = "",
      q155_activate_insight          = "",
      q177_activate_yns              = "",
      q129_build_percentage          = "",
      q136_build_category            = "",
      q156_build_insight             = "",
      q178_build_yns                 = "",
      q130_leverage_percentage       = "",
      q137_leverage_category         = "",
      q157_leverage_insight          = "",
      q179_leverage_yns              = "",
      q186_execute_percentage        = "",
      q138_execute_category          = "",
      q158_execute_insight           = "",
      q180_execute_yns               = "",
      q133_final_percentage          = "",
      q159_final_summary_insight     = "",
      q188_final_summary_yns         = ""
    } = req.body;

    // Basic validation
    if (!user_id || !email) {
      console.warn("⚠️ Missing user_id or email:", { user_id, email });
      return res.status(400).send("Missing user_id or email");
    }

    // Build our row
    const row = {
      user_id,
      submission_date: new Date().toISOString(),
      first_name,
      last_name,
      email,
      activate_percentage:       q118_activate_percentage,
      activate_category:         q119_activate_category,
      activate_insight:          q155_activate_insight,
      activate_yns:              q177_activate_yns,
      build_percentage:          q129_build_percentage,
      build_category:            q136_build_category,
      build_insight:             q156_build_insight,
      build_yns:                 q178_build_yns,
      leverage_percentage:       q130_leverage_percentage,
      leverage_category:         q137_leverage_category,
      leverage_insight:          q157_leverage_insight,
      leverage_yns:              q179_leverage_yns,
      execute_percentage:        q186_execute_percentage,
      execute_category:          q138_execute_category,
      execute_insight:           q158_execute_insight,
      execute_yns:               q180_execute_yns,
      final_percentage:          q133_final_percentage,
      final_summary_insight:     q159_final_summary_insight,
      final_summary_yns:         q188_final_summary_yns,
      raw_submission:            req.body
    };

    // Insert into our new table
    const { error } = await supabase
      .from("assessment_results_2")
      .insert(row);

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).send("Insert failed");
    }

    console.log("✅ Insert successful");
    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).send("Internal Error");
  }
});

app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`);
});
