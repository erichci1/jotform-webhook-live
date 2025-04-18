import express from "express"
import bodyParser from "body-parser"
import { createClient } from "@supabase/supabase-js"

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const supabase = createClient(
  "https://srkuufwbwqipohhcmqmu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8"
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
    name: payload.q1_name || null,
    activate_percentage: payload.q2_activate_percentage || null,
    activate_category: payload.q3_activate_category || null,
    activate_insight: payload.q4_activate_insight || null,
    activate_yns: payload.q5_activate_yns || null,
    build_percentage: payload.q6_build_percentage || null,
    build_category: payload.q7_build_category || null,
    build_insight: payload.q8_build_insight || null,
    build_yns: payload.q9_build_yns || null,
    leverage_percentage: payload.q10_leverage_percentage || null,
    leverage_category: payload.q11_leverage_category || null,
    leverage_insight: payload.q12_leverage_insight || null,
    leverage_yns: payload.q13_leverage_yns || null,
    execute_percentage: payload.q14_execute_percentage || null,
    execute_category: payload.q15_execute_category || null,
    execute_insight: payload.q16_execute_insight || null,
    execute_yns: payload.q17_execute_yns || null,
    final_percentage: payload.q18_final_percentage || null,
    final_summary_insight: payload.q19_final_summary_insight || null,
    final_summary_yns: payload.q20_final_summary_yns || null,
    pretty_summary: `Name: ${payload.q1_name}, Email: ${email}, user_id: ${user_id}`,
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
