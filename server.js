import express from "express"
import multer from "multer"
import { createClient } from "@supabase/supabase-js"

const app = express()
const upload = multer() // Handles multipart/form-data

// ✅ Middleware to parse multipart/form-data from Jotform
app.use(upload.none())

// Optional: enable parsing of other content types (not used by Jotform webhook)
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// 🔐 Supabase setup
const SUPABASE_URL = "https://srkuufwbwqipohhcmqmu.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

app.post("/", async (req, res) => {
  console.log("📬 Incoming Webhook Submission")
  console.log("🗝️  Keys in req.body:", Object.keys(req.body))
  console.log("📦 Raw Payload:", JSON.stringify(req.body, null, 2))

  const userId = req.body.q189_user_id
  const email = req.body.q12_email

  console.log("🧠 user_id received:", userId)
  console.log("📧 email parsed:", email)

  if (!userId || !email) {
    console.error("❌ Missing user_id or email in submitted data")
    return res.status(400).send("Missing user_id or email")
  }

  // 🔎 Check if row already exists
  const { data: existingRow, error: fetchError } = await supabase
    .from("assessment_results")
    .select("id")
    .eq("user_id", userId)
    .single()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.warn("⚠️ Lookup error:", fetchError.message)
  }

  if (!existingRow) {
    console.log("🌱 No row found. Inserting seed for user_id:", userId)
    const { error: insertError } = await supabase
      .from("assessment_results")
      .insert([{ user_id: userId, email, status: "seed_planted" }])

    if (insertError) {
      console.error("❌ Failed to insert placeholder row:", insertError.message)
      return res.status(500).send("Unable to plant initial seed")
    }
  }

  // 🌿 Update submission details
  const { error: updateError } = await supabase
    .from("assessment_results")
    .update({
      raw_submission: JSON.stringify(req.body),
      pretty_summary: `Submitted by ${email}`,
      status: "submitted",
    })
    .eq("user_id", userId)

  if (updateError) {
    console.error("❌ Failed to update assessment:", updateError.message)
    return res.status(500).send("Update failed")
  }

  console.log("✅ Assessment updated for:", userId)
  return res.status(200).send("Assessment stored successfully")
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on http://localhost:${PORT}`)
})
