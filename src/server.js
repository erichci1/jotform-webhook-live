// server.js
const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

// ----------------------------------------------------------------------------
// env check
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("🔥 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

// ----------------------------------------------------------------------------
// supabase client (service role)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ----------------------------------------------------------------------------
// express setup
const app = express();
const port = process.env.PORT || 10000;

// parse JSON and URL‑encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ----------------------------------------------------------------------------
// webhook endpoint: POST /
app.post("/", async (req, res) => {
  console.log("Raw payload:", req.body);

  // pull out the two required fields (adjust the keys to your Jotform field IDs)
  const {
    q189_user_id: user_id,
    q12_email: email,
    // … pull any other fields here as needed …
  } = req.body || {};

  if (!user_id || !email) {
    console.warn("❗️ Missing user_id or email:", { user_id, email });
    return res.status(400).send("Missing user_id or email");
  }

  // build your Supabase row
  const row = {
    user_id,
    email,
    // … any other columns you want to insert …
    created_at: new Date().toISOString(),
  };

  // insert!
  const { error } = await supabase
    .from("assessment_results")
    .insert([row]);

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).send("Insert failed");
  }

  console.log("✅ Inserted:", row);
  return res.status(200).send("OK");
});

// ----------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`);
});
