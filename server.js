// server.js
import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const app = express();
const upload = multer();

// allow JSON bodies too (in case you switch JotForm to send JSON)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error("🚨 Missing SUPABASE_URL or SUPABASE_ANON_KEY in env");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.post("/", upload.none(), async (req, res) => {
  // Step 1: log what we got
  console.log("🔑 Received keys:", Object.keys(req.body));
  console.log("📦 Raw body dump:", JSON.stringify(req.body, null, 2));

  // Step 2: if JotForm is sending a `rawRequest` field, parse that JSON
  let payload = req.body;
  if (payload.rawRequest) {
    try {
      payload = JSON.parse(payload.rawRequest);
      console.log("📥 Using parsed rawRequest payload:", payload);
    } catch (err) {
      console.warn("⚠️  rawRequest JSON parse failed:", err);
      // we'll continue with the unparsed form fields…
    }
  }

  // Step 3: pull out user_id & email
  const user_id = payload.user_id || null;
  const email   = payload.email   || null;

  if (!user_id || !email) {
    console.warn("⚠️ Missing user_id or email:", { user_id, email });
    return res.status(400).send("Missing user_id or email");
  }

  // Step 4: build your insert row however you like
  const row = {
    user_id,
    email,
    submission_id: payload.submissionID || payload.submissionid || null,
    form_id:       payload.formID       || payload.formid       || null,
    full_payload:  payload,       // store entire JSON if you want
    created_at:    new Date(),
  };

  // Step 5: write into Supabase
  const { error } = await supabase
    .from("assessments")
    .insert([row]);

  if (error) {
    console.error("❌ Supabase insert error:", error);
    return res.status(500).send("DB insert failed");
  }

  console.log("✅ Successfully inserted assessment for", user_id);
  res.status(200).send("OK");
});

app.get("/", (_req, res) => {
  res.send("🎉 JotForm webhook server is live!");
});

app.listen(PORT, () => {
  console.log(`🚀 Listening on port ${PORT}`);
});
