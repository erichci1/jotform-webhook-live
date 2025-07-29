import express from "express";
import { json, urlencoded } from "body-parser";
import { createClient } from "@supabase/supabase-js";

const app = express();
const port = process.env.PORT || 3000;

// keep the raw body so we can inspect it
app.use(
  json({
    verify: (req, _res, buf) => {
      // stash a copy of the raw request for debugging
      req.rawBody = buf.toString();
    },
  })
);
app.use(
  urlencoded({
    extended: true,
    verify: (req, _res, buf) => {
      // if Jotform posts as form‑urlencoded, capture that raw too
      req.rawBody = buf.toString();
    },
  })
);

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

app.post("/jotform-webhook", async (req, res) => {
  // 1) raw
  console.log("⏺ Raw payload:", req.rawBody);
  // 2) parsed
  console.log("🔑 Parsed body object:", req.body);

  // now you can safely destructure
  const {
    q12_email,
    q189_user_id,
    q118_activate_percentage,
    q119_activate_category,
    // …etc
  } = req.body;

  if (!q189_user_id || !q12_email) {
    console.warn("⚠️ Missing user_id or email:", {
      user_id: q189_user_id,
      email: q12_email,
    });
    return res.status(400).send("Missing user_id or email");
  }

  const payload = {
    user_id: q189_user_id,
    email: q12_email,
    activate_percentage: q118_activate_percentage,
    activate_category: q119_activate_category,
    // …map the rest…
  };

  const { error } = await supabase.from("assessment_results").insert([payload]);
  if (error) {
    console.error("❌ Supabase insert error:", error);
    return res.status(500).send("Insert failed");
  }

  console.log("✅ Inserted payload:", payload);
  res.status(200).send("Webhook processed and inserted.");
});

app.listen(port, () => {
  console.log(`🚀 Webhook server listening on port ${port}`);
});
