// 🌱 Updated server.js with fallback logic for missing user_id
import express from "express"
import bodyParser from "body-parser"
import { createClient } from "@supabase/supabase-js"

const app = express()

// ✅ Fixes the rawRequest being undefined by supporting x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json()) // optionally keep for JSON payloads

const SUPABASE_URL = "https://srkuufwbwqipohhcmqmu.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.post("/", async (req, res) => {
  const payload = req.body
  console.log("📥 Incoming Submission:", req.body?.rawRequest || req.body || "No body received");


  // 🌿 Extract values
  const raw = payload.rawRequest || ""
  const pretty = payload.pretty || ""
  const userId = pretty.match(/user_id:([a-f0-9\-]+)/)?.[1] || null
  const email = pretty.match(/Email:([\w.@+-]+)/)?.[1] || null

  console.log("🧠 user_id received:", userId)
  console.log("📧 email parsed:", email)

  if (!userId || !email) {
    console.error("❌ Missing user_id or email in submitted data")
    return res.status(400).send("Missing user_id or email")
  }

  // ✅ Check if row already exists for this user
  const { data: existingRow, error: fetchError } = await supabase
    .from("assessment_results")
    .select("id")
    .eq("user_id", userId)
    .single()

  if (fetchError) {
    console.warn("⚠️ Lookup error:", fetchError.message)
  }

  if (!existingRow) {
    console.log("🌱 No row found. Inserting new seed for user_id:", userId)
    const { error: insertError } = await supabase
      .from("assessment_results")
      .insert([{ user_id: userId, email, status: "pending" }])

    if (insertError) {
      console.error("❌ Failed to insert placeholder row:", insertError.message)
      return res.status(500).send("Unable to plant initial seed")
    }
  }

  // 🌿 Update the row with full payload now
  const { error: updateError } = await supabase
    .from("assessment_results")
    .update({
      raw_submission: raw,
      pretty_summary: pretty,
      status: "submitted",
    })
    .eq("user_id", userId)

  if (updateError) {
    console.error("❌ Failed to update assessment:", updateError.message)
    return res.status(500).send("Update failed")
  }

  console.log("✅ Assessment data updated successfully for:", userId)
  return res.status(200).send("Assessment stored successfully")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on http://localhost:${PORT}`)
})