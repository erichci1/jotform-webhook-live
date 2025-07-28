// server.js
const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = process.env.PORT || 10000;

// ← your real Supabase URL & Service Role Key here
const supabaseUrl = "https://srkuufwbwqipohhcmqmu.supabase.co";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzExMDUwNiwiZXhwIjoyMDU4Njg2NTA2fQ.xC-gC3izZAqAtQVXEFp6h4RbuT5LFBKnrqasRmvtTEU"; 

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ← listen on root POST /
app.post("/", async (req, res) => {
  console.log("🔔 Raw payload:", req.body);

  // Pull out your form fields—adjust these to your JotForm field names
  const {
    q189_user_id,     // JotForm field key for user_id
    q12_email,        // JotForm field key for email
    q118_activate_percentage,
    // …and so on for all the q###_… fields…
  } = req.body;

  console.log({ user_id: q189_user_id, email: q12_email });

  if (!q189_user_id || !q12_email) {
    console.warn("⚠️ Missing user_id or email:", { user_id: q189_user_id, email: q12_email });
    return res.status(400).send("Missing user_id or email");
  }

  const payload = {
    user_id: q189_user_id,
    email: q12_email,
    activate_percentage: q118_activate_percentage || null,
    // …map the rest of your fields here…
    // e.g. build_percentage: req.body.q119_build_percentage, etc.
  };

  const { error } = await supabase.from("assessment_results").insert([payload]);
  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).send("Insert failed");
  }
  console.log("✅ Inserted:", payload);
  res.status(200).send("OK");
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
