// src/server.js
import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load .env locally (Render will inject based on its dashboard vars)
dotenv.config();

const app = express();
const upload = multer(); // for parsing multipart/form-data

// Initialize Supabase client with your env vars
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.post("/", upload.none(), async (req, res) => {
  const payload = req.body || {};
  const user_id = payload.q189_user_id;
  const email = payload.q12_email;

  if (!user_id || !email) {
    console.error("Missing user_id or email in submitted data");
    return res.status(400).send("Missing user_id or email");
  }

  const formData = {
    user_id,
    email,
    name: payload.name || null,
    activate_percentage: payload.activate_percentage || null,
    /* … all your other fields … */
    raw_submission: JSON.stringify(payload),
    status: "submitted",
  };

  const { error } = await supabase
    .from("assessment_results")
    .upsert(formData, { onConflict: ["user_id"] });

  if (error) {
    console.error("Supabase insert error:", error.message);
    return res.status(500).send("Database insert failed");
  }

  return res.status(200).send("Stored successfully");
});

// Use the port Render gives you, or fallback to 3000 locally
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
