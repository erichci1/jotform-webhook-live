import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const app = express();
const upload = multer();

const SUPABASE_URL = "https://srkuufwbwqipohhcmqmu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function extractFromPretty(pretty, label) {
  if (!pretty || !label) return null;
  const match = new RegExp(`${label}\\s*:\\s*([^,\\n]+)`).exec(pretty);
  return match ? match[1].trim() : null;
}

app.post("/", upload.none(), async (req, res) => {
  try {
    const data = req.body;
    console.log("📦 Raw Payload Received:", data);

    let userId = data.q189_user_id || null;
    let email = data.q12_email || null;
    const pretty = data.pretty || "";

    // 🔎 Fallback: parse from pretty string
    if (!userId) userId = extractFromPretty(pretty, "user_id");
    if (!email) email = extractFromPretty(pretty, "Email");

    console.log("🧠 user_id extracted:", userId);
    console.log("📧 email extracted:", email);

    if (!userId || !email) {
      console.error("❌ Missing user_id or email in submitted data");
      return res.status(400).send("Missing user_id or email");
    }

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
        console.error("❌ Insert failed:", insertError.message);
        return res.status(500).send("Insert failed");
      }
    }

    const { error: updateError } = await supabase
      .from("assessment_results")
      .update({
        raw_submission: JSON.stringify(data),
        pretty_summary: pretty,
        status: "submitted",
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("❌ Update failed:", updateError.message);
      return res.status(500).send("Update failed");
    }

    console.log("✅ Assessment stored successfully for:", userId);
    return res.status(200).send("Success");
  } catch (err) {
    console.error("🔥 Unhandled error:", err.message);
    return res.status(500).send("Server Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on http://localhost:${PORT}`);
});
