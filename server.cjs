// server.cjs
import express from "express";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

const app = express();
const port = process.env.PORT || 10000;

// — replace these with your own project URL & service-role key:
const SUPA_URL = "https://srkuufwbwqipohhcmqmu.supabase.co";
const SUPA_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzExMDUwNiwiZXhwIjoyMDU4Njg2NTA2fQ.xC-gC3izZAqAtQVXEFp6h4RbuT5LFBKnrqasRmvtTEU";
const supabase = createClient(SUPA_URL, SUPA_SERVICE_ROLE_KEY);

// allow big JSON payloads
app.use(bodyParser.json({ limit: "5mb" }));
// also parse urlencoded (form posts) just in case
app.use(bodyParser.urlencoded({ extended: true, limit: "5mb" }));

app.post("/", async (req, res) => {
  try {
    console.log("─── request body ───");
    console.log(JSON.stringify(req.body, null, 2));

    // JotForm wraps your fields in a `rawRequest` JSON string
    let payload = req.body;
    if (req.body.rawRequest) {
      try {
        payload = JSON.parse(req.body.rawRequest);
        console.log("─── parsed rawRequest ───");
        console.log(JSON.stringify(payload, null, 2));
      } catch (parseErr) {
        console.warn("⚠️  failed to JSON.parse rawRequest:", parseErr);
      }
    }

    // pull out your key fields
    const user_id = payload.q189_user_id || payload.user_id || null;
    const email   = payload.q12_email        || payload.email   || null;

    if (!user_id || !email) {
      console.warn("⚠️  Missing user_id or email:", { user_id, email });
      // you may still want to write partial data or bail out here
    }

    // build the row to insert; adjust any other fields as needed
    const row = {
      user_id,
      email,
      // if you have a submission timestamp field in JotForm...
      submission_date: payload.submissionDate || new Date().toISOString(),
      // example of grabbing one of your assessment fields
      activate_percentage: payload.q118_activate_percentage || null,
      activate_category:   payload.q119_activate_category   || null,
      // … repeat for every q### field you need …
      // leverage_percentage: payload.q187_leverage_percentage || null,
      // etc.
    };

    console.log("─── inserting row ───", row);
    const { error } = await supabase.from("assessment_results").insert([row]);
    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).send("Insert failed");
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("💥 webhook handler error:", err);
    return res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log(`🚀 Webhook server listening on port ${port}`);
});
