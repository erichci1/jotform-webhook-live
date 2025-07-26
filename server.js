// src/server.js
import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

// middleware to parse multipart/form-data (JotForm webhooks)
const upload = multer();
const app = express();
const PORT = process.env.PORT || 10000;

// load Supabase creds from environment
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_KEY;

// if you forgot to set them in Render dashboard → Environment, crash early
if (!SUPA_URL || !SUPA_KEY) {
  console.error("🚨 Missing SUPABASE_URL or SUPABASE_KEY environment variable!");
  process.exit(1);
}

// init Supabase client
const supabase = createClient(SUPA_URL, SUPA_KEY);

app.post("/", upload.none(), async (req, res) => {
  try {
    const payload = req.body || {};
    console.log("🔑 Received keys:", Object.keys(payload));

    const user_id = payload.q189_user_id;
    const email   = payload.q12_email;

    if (!user_id || !email) {
      console.error("❌ Missing user_id or email:", { user_id, email });
      return res.status(400).send("Missing user_id or email");
    }

    // map JotForm fields → your DB columns
    const formData = {
      user_id,
      email,
      name:                       payload.name                  || null,
      activate_percentage:        payload.activate_percentage   || null,
      activate_category:          payload.activate_category     || null,
      activate_insight:           payload.activate_insight      || null,
      activate_yns:               payload.activate_yns          || null,
      build_percentage:           payload.build_percentage      || null,
      build_category:             payload.build_category        || null,
      build_insight:              payload.build_insight         || null,
      build_yns:                  payload.build_yns             || null,
      leverage_percentage:        payload.leverage_percentage   || null,
      leverage_category:          payload.leverage_category     || null,
      leverage_insight:           payload.leverage_insight      || null,
      leverage_yns:               payload.leverage_yns          || null,
      execute_percentage:         payload.execute_percentage    || null,
      execute_category:           payload.execute_category      || null,
      execute_insight:            payload.execute_insight       || null,
      execute_yns:                payload.execute_yns           || null,
      final_percentage:           payload.final_percentage      || null,
      final_summary_insight:      payload.final_summary_insight || null,
      final_summary_yns:          payload.final_summary_yns     || null,
      pretty_summary: `Name: ${payload.name}, Email: ${email}, user_id: ${user_id}`,
      raw_submission: JSON.stringify(payload),
      status:       "submitted",
      created_at:   new Date().toISOString()
    };

    // upsert on user_id to avoid duplicates
    const { error } = await supabase
      .from("assessment_results")
      .upsert(formData, { onConflict: ["user_id"], returning: "minimal" });

    if (error) {
      console.error("❌ Supabase upsert error:", error);
      return res.status(500).send("Database insert failed");
    }

    console.log("✅ Stored assessment for user:", user_id);
    res.status(200).send("Stored successfully");
  } catch (err) {
    console.error("🔥 Unexpected error:", err);
    res.status(500).send("Server error");
  }
});

// health‑check
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

// start listening
app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
});
