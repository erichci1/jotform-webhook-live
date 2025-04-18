import express from "express"
import multer from "multer"
import { createClient } from "@supabase/supabase-js"

const app = express()
const upload = multer()
app.use(upload.none()) // Handle multipart/form-data

const SUPABASE_URL = "https://srkuufwbwqipohhcmqmu.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

app.post("/", async (req, res) => {
  const payload = req.body
  const pretty = payload.pretty || ""

  console.log("🧾 Full Keys Received:", Object.keys(payload))
  console.log("🧠 Pretty:", pretty)

  // 🔍 Extract values from "pretty" string
  const userId = pretty.match(/user_id:([a-zA-Z0-9\-]+)/)?.[1] || null
  const email = pretty.match(/Email:([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/)?.[1] || null

  console.log("✅ user_id extracted:", userId)
  console.log("✅ email extracted:", email)

  if (!userId || !email) {
    console.error("❌ Missing user_id or email in 'pretty'")
    return res.status(400).send("Missing user_id or email")
  }

  const { data: existingRow, error: fetchError } = await supabase
    .from("assessment_results")
    .select("id")
    .eq("user_id", userId)
    .single()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.warn("⚠️ Lookup error:", fetchError.message)
  }

  if (!existingRow) {
    const { error: insertError } = await supabase
      .from("assessment_results")
      .insert([{ user_id: userId, email, status: "seed_planted" }])

    if (insertError) {
      console.error("❌ Failed to insert new row:", insertError.message)
      return res.status(500).send("Insert failed")
    }
  }

  const { error: updateError } = await supabase
    .from("assessment_results")
    .update({
      raw_submission: JSON.stringify(req.body),
      pretty_summary: pretty,
      status: "submitted"
    })
    .eq("user_id", userId)

  if (updateError) {
    console.error("❌ Failed to update row:", updateError.message)
    return res.status(500).send("Update failed")
  }

  console.log("🎉 Successfully stored submission for:", userId)
  return res.status(200).send("Success")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`)
})
