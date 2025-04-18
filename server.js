import express from "express"
import bodyParser from "body-parser"
import { createClient } from "@supabase/supabase-js"

const app = express()

// Middleware for form and JSON payloads
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const SUPABASE_URL = "https://srkuufwbwqipohhcmqmu.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

app.post("/", async (req, res) => {
  // Debug logging to trace Jotform payload
  console.log("🔍 Request Headers:", req.headers)
  console.log("📦 Payload Type:", typeof req.body)
  console.log("📦 Raw Payload:", req.body)

  const keys = Object.keys(req.body || {})
  console.log("🗂️ Keys Received:", keys)

  const userId = req.body?.q189_user_id || null
  const email = req.body?.q12_email || null

  console.log("🧠 user_id received:", userId)
  console.log("📧 email parsed:", email)

  if (!userId || !email) {
    console.error("❌ Missing user_id or email in submitted data")
    return res.status(400).send("Missing user_id or email")
  }

  // Check if row already exists
  const { data: existingRow, error: fetchError } = await supabase
    .from("assessment_results")
    .select("id")
    .eq("user_id", userId)
    .single()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.warn("⚠️ Lookup error:", fetchError.message)
  }

  if (!existingRow) {
    console.log("🌱 Inserting seed row for:", userId)
    const { error: insertError } = await supabase
      .from("assessment_results")
      .insert([{ user_id: userId, email, status: "seed_planted" }])

    if (insertError) {
      console.error("❌ Insert failed:", insertError.message)
      return res.status(500).send("Insert failed")
    }
  }

  // Update the row with full form submission
  const { error: updateError } = await supabase
    .from("assessment_results")
    .update({
      raw_submission: JSON.stringify(req.body),
      pretty_summary: `Submitted by ${email}`,
      status: "submitted",
    })
    .eq("user_id", userId)

  if (updateError) {
    console.error("❌ Update failed:", updateError.message)
    return res.status(500).send("Update failed")
  }

  console.log("✅ Successfully stored assessment for:", userId)
  return res.status(200).send("Assessment stored successfully")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running at http://localhost:${PORT}`)
})
