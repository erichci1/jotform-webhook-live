// server.js
import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

// 1) pull in your Supabase creds
const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in env");
  process.exit(1);
}

// 2) init Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3) Express + Multer setup
const app    = express();
const upload = multer();      // parse multipart/form-data
const PORT   = process.env.PORT || 10000;

// 4) health‐check
app.get("/", (_req, res) => {
  res.send("Webhook server is live 🎉");
});

// 5) webhook handler
app.post("/", upload.none(), async (req, res) => {
  try {
    console.log("🔑 Received keys:", Object.keys(req.body));

    // JotForm sends rawRequest + customParams (as strings)
    const { rawRequest, customParams } = req.body;

    // parse out your user_id & email
    let user_id = null,
        email   = null;
    if (customParams) {
      try {
        const params = JSON.parse(customParams);
        user_id = params.user_id;
        email   = params.email;
      } catch (e) {
        console.warn("⚠️ Could not JSON.parse customParams", e);
      }
    }

    if (!user_id || !email) {
      console.warn("⚠️ Missing user_id or email:", { user_id, email });
      return res.status(400).send("Missing user_id or email");
    }

    // parse the full submission payload if you need it
    let submission = {};
    try {
      submission = JSON.parse(rawRequest);
    } catch (e) {
      console.warn("⚠️ rawRequest not valid JSON, storing empty object");
    }

    // write to your assessments table
    const { error } = await supabase
      .from("assessments")
      .insert([
        { user_id, email, submission }
      ]);

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).send("DB error");
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    res.status(500).send("Server error");
  }
});

// 6) kick off
app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
});
