import express from "express"
import bodyParser from "body-parser"
import { createClient } from "@supabase/supabase-js"

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const SUPABASE_URL = "https://srkuufwbwqipohhcmqmu.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

app.post("/", async (req, res) => {
  let payload = req.body

  // 🔍 If empty, attempt to parse from rawRequest (stringified object from Jotform)
  if (!payload || Object.keys(payload).length === 0) {
    try {
      const raw = JSON.parse(req.body?.rawRequest || "{}")
      payload = raw
      console.log("🪄 Parsed payload from rawRequest")
    } catch (error) {
      console.error("❌ Failed to parse rawRequest")
      return res.status(400).send("Invalid or missing payload")
    }
  }

  console.log("📥 Final Payload:", payload)

  const userId = payload.q189_user_id
  const email = payload.q12_email
  const raw = JSON.stringify(payload, null, 2)
  const pretty = Object.entries(payload)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")

  console.log("🧠 user_id received:", userId)
  console.log("📧 email parsed:", email)

  if (!userId || !email) {
    console.error("❌ Missing user_id or email in submitted data")
    return res.status(400).send("Missing user_id or email")
  }

  const { data: existingRow, error: fetchError } = await supabase
    .from("assessment_results")
    .select("id")
    .eq("user_id", userId)
    .single()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("⚠️ Lookup error:", fetchError.message)
  }

  if (!existingRow) {
    console.log("🌱 No row found. Inserting new seed for user_id:", userId)
    const { error: insertError } = await supabase
      .from("assessment_results")
      .insert([{ user_id: userId, email, status: "seed_planted" }])

    if (insertError) {
      console.error("❌ Failed to insert seed:", insertError.message)
      return res.status(500).send("Failed to plant seed")
    }
  }

  const { error: updateError } = await supabase
    .from("assessment_results")
    .update({
      raw_submission: raw,
      pretty_summary: pretty,
      status: "submitted",
    })
    .eq("user_id", userId)

  if (updateError) {
    console.error("❌ Failed to update record:", updateError.message)
    return res.status(500).send("Failed to update assessment")
  }

  console.log("✅ Assessment stored successfully for:", userId)
  return res.status(200).send("Assessment stored successfully")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on http://localhost:${PORT}`)
})
