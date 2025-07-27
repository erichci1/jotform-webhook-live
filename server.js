// server.js
import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const app = express();
const upload = multer();             // multer will parse multipart/form-data
const PORT = process.env.PORT || 10000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error("🔥 Missing SUPABASE_URL or SUPABASE_ANON_KEY in env");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.post("/", upload.none(), async (req, res) => {
  console.log("🔑 Received keys:", Object.keys(req.body));
  console.log("📦 Full payload:", JSON.stringify(req.body, null, 2));

  const user_id = req.body.user_id || null;
  const email   = req.body.email   || null;

  if (!user_id || !email) {
    console.warn("⚠️ Missing user_id or email:", { user_id, email });
    return res.status(400).send("Missing user_id or email");
  }

  // Prepare the row. Store everything you like; here’s an example:
  const row = {
    user_id,
    email,
    submission_id: req.body.submissionID || null,
    form_id:       req.body.formID       || null,
    raw_payload:   req.body,             // you can JSON.stringify this if your column is text
    created_at:    new Date(),
  };

  const { error } = await supabase
    .from("assessments")
    .insert([row]);

  if (error) {
    console.error("❌ Supabase insert error:", error);
    return res.status(500).send("DB insert failed");
  }

  console.log("✅ Inserted assessment for", user_id);
  res.status(200).send("OK");
});

app.get("/", (_req, res) => {
  res.send("🎉 JotForm webhook is alive");
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
});
