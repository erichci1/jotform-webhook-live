import express from "express"
import multer from "multer"
import { createClient } from "@supabase/supabase-js"

const app = express()
const upload = multer()
app.use(upload.none()) // ✅ handles multipart/form-data from Jotform

const supabase = createClient(
  "https://srkuufwbwqipohhcmqmu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8."
)

app.post("/", async (req, res) => {
  const payload = req.body
  const keys = Object.keys(payload || {})
  console.log("🔑 Keys Received:", keys)

  const user_id = payload.q189_user_id
  const email = payload.q12_email

  console.log("🧠 user_id extracted:", user_id)
  console.log("📧 email extracted:", email)

  if (!user_id || !email) {
    console.error("❌ Missing user_id or email in submitted data")
    return res.status(400).send("Missing user_id or email")
  }

  const formData = {
    user_id,
    email,
    name: payload.name || null,
    activate_percentage: payload.activate_percentage || null,
    activate_category: payload.activate_category || null,
    activate_insight: payload.activate_insight || null,
    activate_yns: payload.activate_yns || null,
    build_percentage: payload.build_percentage || null,
    build_category: payload.build_category || null,
    build_insight: payload.build_insight || null,
    build_yns: payload.build_yns || null,
    leverage_percentage: payload.leverage_percentage || null,
    leverage_category: payload.leverage_category || null,
    leverage_insight: payload.leverage_insight || null,
    leverage_yns: payload.leverage_yns || null,
    execute_percentage: payload.execute_percentage || null,
    execute_category: payload.execute_category || null,
    execute_insight: payload.execute_insight || null,
    execute_yns: payload.execute_yns || null,
    final_percentage: payload.final_percentage || null,
    final_summary_insight: payload.final_summary_insight || null,
    final_summary_yns: payload.final_summary_yns || null,
    pretty_summary: `Name: ${payload.name}, Email:${email}, user_id:${user_id}`,
    raw_submission: JSON.stringify(payload),
    status: "submitted"
  }

  const { data, error } = await supabase
    .from("assessment_results")
    .upsert(formData, { onConflict: ["user_id"], ignoreDuplicates: false })

  if (error) {
    console.error("❌ Supabase insert error:", error.message)
    return res.status(500).send("Database insert failed")
  }

  console.log("✅ Assessment stored successfully:", user_id)
  return res.status(200).send("Stored successfully")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
