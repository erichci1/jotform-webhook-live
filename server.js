import express from "express"
import bodyParser from "body-parser"
import { createClient } from "@supabase/supabase-js"

const app = express()

// Middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const SUPABASE_URL = "https://srkuufwbwqipohhcmqmu.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

app.post("/", async (req, res) => {
  const payload = req.body || {}
  console.log("📦 Final Payload:", payload)

  // Log all keys to debug form input
  console.log("🧩 Full keys received:", Object.keys(payload))

  // Pull from form field keys (make sure Jotform unique names are correct)
  const userId = payload["q189_user_id"] || null
  const email = payload["q12_email"] || null

  console.log("🧠 user_id received:", userId)
  console.log("📧 email parsed:", email)

  if (!userId || !email) {
    console.error("❌ Missing user_id or email in submitted data")
    return res.status(400).send("Missing user_id or email")
  }

  // Check for existing user
  const { data: existingRow, error: fetchError } = await supabase
    .from("assessment_results")
    .select("id")
    .eq("user_id", userId)
    .single()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.warn("⚠️ Lookup error:", fetchError.message)
  }

  // Insert row if missing
  if (!existingRow) {
    console.log("🌱 No row found. Inserting seed for:", userId)
    const { error: insertError } = await supabase
      .from("assessment_results")
      .insert([{ user_id: userId, email, status: "seed_planted" }])

    if (insertError) {
      console.error("❌ Failed to insert row:", insertError.message)
      return res.status(500).send("Unable to insert seed")
    }
  }

  // Update record with full payload
  const { error: updateError } = await supabase
    .from("assessment_results")
    .update({
      raw_submission: JSON.stringify(payload),
      pretty_summary: `Submitted by ${email}`,
      status: "submitted",
    })
    .eq("user_id", userId)

  if (updateError) {
    console.error("❌ Update error:", updateError.message)
    return res.status(500).send("Update failed")
  }

  console.log("✅ Submission stored for:", userId)
  return res.status(200).send("Assessment stored successfully")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running at http://localhost:${PORT}`)
})
