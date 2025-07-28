// server.js
const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = process.env.PORT || 3000;

// Supabase credentials (use Service Role key for server inserts)
const supabaseUrl = "https://srkuufwbwqipohhcmqmu.supabase.co";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzExMDUwNiwiZXhwIjoyMDU4Njg2NTA2fQ.xC-gC3izZAqAtQVXEFp6h4RbuT5LFBKnrqasRmvtTEU";
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post("/jotform-webhook", async (req, res) => {
  try {
    const data = req.body;

    // Example mapping — adjust keys to match your actual Jotform field IDs
    const payload = {
      user_id: data.answers["user_id"]?.answer || null,
      submission_date: data.submission_date || new Date().toISOString(),
      name: data.answers["name"]?.answer || "",
      email: data.answers["email"]?.answer || "",
      activate_percentage: data.answers["activate_percentage"]?.answer || "",
      activate_category: data.answers["activate_category"]?.answer || "",
      activate_wtm: data.answers["activate_wtm"]?.answer || "",
      activate_yns: data.answers["activate_yns"]?.answer || "",
      build_percentage: data.answers["build_percentage"]?.answer || "",
      build_category: data.answers["build_category"]?.answer || "",
      build_wtm: data.answers["build_wtm"]?.answer || "",
      build_yns: data.answers["build_yns"]?.answer || "",
      leverage_percentage: data.answers["leverage_percentage"]?.answer || "",
      leverage_category: data.answers["leverage_category"]?.answer || "",
      leverage_wtm: data.answers["leverage_wtm"]?.answer || "",
      leverage_yns: data.answers["leverage_yns"]?.answer || "",
      execute_percentage: data.answers["execute_percentage"]?.answer || "",
      execute_category: data.answers["execute_category"]?.answer || "",
      execute_wtm: data.answers["execute_wtm"]?.answer || "",
      execute_yns: data.answers["execute_yns"]?.answer || "",
      final_percentage: data.answers["final_percentage"]?.answer || "",
      final_summary_wtm: data.answers["final_summary_wtm"]?.answer || "",
      final_summary_yns: data.answers["final_summary_yns"]?.answer || ""
    };

    const { error } = await supabase
      .from("assessment_results")
      .insert([payload]);

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).send("Insert failed");
    }

    return res.status(200).send("Webhook processed and inserted.");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
