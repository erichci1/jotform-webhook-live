// server.js
import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const upload = multer();

// 1) Body‐parsing for JSON, URL‐encoded, and multipart form‐data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(upload.none());

// 2) Supabase client (you should store these in your .env!)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// 3) Webhook endpoint
app.post("/", async (req, res) => {
  // 3a) Log the raw incoming payload so we can see every key
  console.log("📥 JotForm sent us:", JSON.stringify(req.body, null, 2));

  // 3b) Grab the user+email fields after you confirm what they’re called
  const user_id   = req.body.q189_user_id;
  const email     = req.body.q12_email;

  if (!user_id || !email) {
    console.warn("⚠️ Missing user_id or email:", { user_id, email });
    return res.status(400).send("Missing user_id or email");
  }

  // 3c) Build out your payload – expand with all your q### fields
  const payload = {
    user_id,
    email,
    activate_percentage:   req.body.q118_activate_percentage   || null,
    activate_category:     req.body.q119_activate_category     || null,
    // …and so on for all your fields…
    submission_date: new Date().toISOString(),
  };

  // 4) Insert into Supabase
  const { error } = await supabase
    .from("assessment_results")
    .insert([payload]);

  if (error) {
    console.error("❌ Supabase insert error:", error);
    return res.status(500).send("Insert failed");
  }

  console.log("✅ Inserted:", payload);
  res.status(200).send("OK");
});

// 5) Kick off
app.listen(port, () => {
  console.log(`🚀 Webhook server listening on port ${port}`);
});
