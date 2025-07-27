// server.js
import express from "express"
import multer from "multer"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

// 1) Pull our Supabase URL + KEY from env
const { SUPABASE_URL, SUPABASE_KEY, PORT = 10000 } = process.env
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY in env")
  process.exit(1)
}

// 2) Init Express + Multer
const app = express()
const upload = multer() // parse multipart/form-data bodies

// 3) Init Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

app.post("/", upload.none(), async (req, res) => {
  const payload = req.body
  console.log("🔔 Payload from JotForm:", payload)

  // 4) JotForm nests your hidden inputs under customParams
  let custom = {}
  if (payload.customParams) {
    try {
      custom =
        typeof payload.customParams === "string"
          ? JSON.parse(payload.customParams)
          : payload.customParams
    } catch (err) {
      console.warn("⚠️ could not parse customParams:", err)
    }
  }

  // 5) Extract user_id + email (either top‑level or in customParams)
  const user_id = payload.user_id || custom.user_id
  const email = payload.email || custom.email

  if (!user_id || !email) {
    console.warn("⚠️ Missing user_id or email:", { user_id, email })
    return res.status(400).send("Missing user_id or email")
  }

  // 6) Build your upsert object
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
    pretty_summary: `Name: ${payload.name}, Email: ${email}, user_id: ${user_id}`,
    raw_submission: JSON.stringify(payload),
    status: "submitted",
  }

  // 7) Upsert into Supabase
  const { error } = await supabase
    .from("assessment_results")
    .upsert(formData, { onConflict: ["user_id"] })

  if (error) {
    console.error("❌ Supabase error:", error)
    return res.status(500).send("Database insert failed")
  }

  console.log("✅ Stored assessment for user:", user_id)
  res.send("Stored successfully")
})

app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`)
})
