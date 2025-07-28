// server.cjs
const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

// ─── CONFIG ──────────────────────────────────────────────────────────────────────
const app  = express();
const port = process.env.PORT || 10000;

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────────
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ─── ROUTE ─────────────────────────────────────────────────────────────────────────
app.post("/jotform-webhook", async (req, res) => {
  try {
    // 1) JotForm nests the entire submission under `rawRequest`
    const rawJson = req.body.rawRequest || "{}";
    const raw     = JSON.parse(rawJson);
    console.log("🔍 rawRequest JSON:", raw);

    const a = raw.answers || {};

    // 2) Pull out email & user_id by their question IDs
    const email   = a["q12_email"]?.answer     ?? null;
    const user_id = a["q189_user_id"]?.answer  ?? null;

    if (!email || !user_id) {
      console.warn("⚠️ Missing user_id or email:", { user_id, email });
      return res.status(400).send("Missing user_id or email");
    }

    // 3) Build the payload, question‑by‑question
    const payload = {
      user_id,
      email,
      submission_date: raw.submissionDate || new Date().toISOString(),

      activate_percentage: a["q118_activate_percentage"]?.answer ?? null,
      activate_category:   a["q118_activate_category"]?.answer   ?? null,
      activate_wtm:        a["q118_activate_wtm"]?.answer        ?? null,
      activate_yns:        a["q118_activate_yns"]?.answer        ?? null,

      build_percentage:    a["q120_build_percentage"]?.answer    ?? null,
      build_category:      a["q120_build_category"]?.answer      ?? null,
      build_wtm:           a["q120_build_wtm"]?.answer           ?? null,
      build_yns:           a["q120_build_yns"]?.answer           ?? null,

      leverage_percentage: a["q167_leverage_percentage"]?.answer ?? null,
      leverage_category:   a["q167_leverage_category"]?.answer   ?? null,
      leverage_wtm:        a["q167_leverage_wtm"]?.answer        ?? null,
      leverage_yns:        a["q167_leverage_yns"]?.answer        ?? null,

      execute_percentage:  a["q180_execute_percentage"]?.answer  ?? null,
      execute_category:    a["q180_execute_category"]?.answer    ?? null,
      execute_wtm:         a["q180_execute_wtm"]?.answer         ?? null,
      execute_yns:         a["q180_execute_yns"]?.answer         ?? null,

      final_percentage:    a["q158_final_percentage"]?.answer    ?? null,
      final_summary_wtm:   a["q158_final_summary_wtm"]?.answer   ?? null,
      final_summary_yns:   a["q158_final_summary_yns"]?.answer   ?? null,
    };

    console.log("🚀 Inserting payload:", payload);

    // 4) Write to Supabase
    const { error } = await supabase
      .from("assessment_results")
      .insert([payload]);

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).send("Insert failed");
    }

    res.status(200).send("Inserted!");
  } catch (err) {
    console.error("🔥 Handler error:", err);
    res.status(500).send("Server error");
  }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`📡 Webhook listening on port ${port}`);
});
