import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const app = express();
const upload = multer(); // Multer handles multipart/form-data

const SUPABASE_URL = "https://srkuufwbwqipohhcmqmu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🌱 Receive Jotform submission via POST
app.post("/", upload.none(), async (req, res) => {
  try {
    const data = req.body;
    console.log("🌐 Raw Payload Received:", data);

    const userId = data.q189_user_id || null;
    const email = data.q12_email || null;
    const pretty = data.pretty || null;

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
        console.error("❌ Failed to insert row:", insertError.message);
        return res.status(500).send("Insert failed");
      }
    }

    const { error: updateError } = await supabase
      .from("assessment_results")
      .update({
        raw_submission: JSON.stringify(data),
        pretty_summary: pretty || "",
        status: "submitted",
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("❌ Update failed:", updateError.message);
      return res.status(500).send("Update failed");
    }

    console.log("✅ Updated assessment for:", userId);
    return res.status(200).send("Success");
  } catch (err) {
    console.error("🔥 Unhandled Error:", err.message);
    return res.status(500).send("Server Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
