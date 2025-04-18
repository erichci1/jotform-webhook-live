import express from "express";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const SUPABASE_URL = "https://srkuufwbwqipohhcmqmu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.post("/", async (req, res) => {
  try {
    const payload = req.body;
    console.log("📦 Raw Payload Received:", payload);

    // Log all keys to confirm structure
    const keys = Object.keys(payload || {});
    console.log("🗝️ Keys Received:", keys);

    const userId = payload["q189_user_id"];
    const email = payload["q12_email"];

    console.log("🧠 user_id extracted:", userId);
    console.log("📧 email extracted:", email);

    if (!userId || !email) {
      console.error("❌ Missing user_id or email in submitted data");
      return res.status(400).send("Missing user_id or email");
    }

    // Check if row already exists
    const { data: existingRow, error: fetchError } = await supabase
      .from("assessment_results")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.warn("⚠️ Lookup error:", fetchError.message);
    }

    if (!existingRow) {
      const { error: insertError } = await supabase
        .from("assessment_results")
        .insert([{ user_id: userId, email, status: "seed_planted" }]);

      if (insertError) {
        console.error("❌ Failed to insert row:", insertError.message);
        return res.status(500).send("Initial insert failed");
      }
    }

    // Now update with full payload
    const { error: updateError } = await supabase
      .from("assessment_results")
      .update({
        raw_submission: JSON.stringify(payload),
        pretty_summary: payload.pretty || null,
        status: "submitted",
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("❌ Failed to update row:", updateError.message);
      return res.status(500).send("Update failed");
    }

    console.log("✅ Submission updated for:", userId);
    return res.status(200).send("Assessment stored successfully");
  } catch (err) {
    console.error("🔥 Unhandled error:", err.message);
    return res.status(500).send("Unhandled error occurred");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on http://localhost:${PORT}`);
});
