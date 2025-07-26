// server.js
import express from "express"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

const app = express()

// 1) parse JSON and URL‑encoded bodies (JotForm may send either)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 2) initialize Supabase using env vars
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// 3) simple GET for Render health‑checks
app.get("/", (_req, res) => {
  res.status(200).send("🟢 OK")
})

// 4) webhook endpoint
app.post("/", async (req, res) => {
  try {
    const payload = req.body || {}
    console.log("🔑 payload keys:", Object.keys(payload))

    // adjust these field names to match your JotForm field IDs
    const user_id = payload.q189_user_id
    const email   = payload.q12_email

    if (!user_id || !email) {
      console.warn("❌ missing user_id/email:", { user_id, email })
      return res.status(400).send("user_id and email are required")
    }

    // build your upsert object; pick the correct field keys from your form
    const formData = {
      user_id,
      email,
      name:                  payload.name               ?? null,
      activate_percentage:   payload.activate_percentage ?? null,
      activate_category:     payload.activate_category   ?? null,
      activate_insight:      payload.activate_insight    ?? null,
      activate_yns:          payload.activate_yns        ?? null,
      build_percentage:      payload.build_percentage    ?? null,
      build_category:        payload.build_category      ?? null,
      build_insight:         payload.build_insight       ?? null,
      build_yns:             payload.build_yns           ?? null,
      leverage_percentage:   payload.leverage_percentage ?? null,
      leverage_category:     payload.leverage_category   ?? null,
      leverage_insight:      payload.leverage_insight    ?? null,
      leverage_yns:          payload.leverage_yns        ?? null,
      execute_percentage:    payload.execute_percentage  ?? null,
      execute_category:      payload.execute_category    ?? null,
      execute_insight:       payload.execute_insight     ?? null,
      execute_yns:           payload.execute_yns         ?? null,
      final_percentage:      payload.final_percentage    ?? null,
      final_summary_insight: payload.final_summary_insight ?? null,
      final_summary_yns:     payload.final_summary_yns   ?? null,
      pretty_summary:        `Name: ${payload.name}, Email: ${email}, user_id: ${user_id}`,
      raw_submission:        JSON.stringify(payload),
      status:                "submitted",
      created_at:            new Date()
    }

    const { error } = await supabase
      .from("assessment_results")
      .upsert(formData, { onConflict: ["user_id"] })

    if (error) {
      console.error("❌ Supabase upsert error:", error)
      return res.status(500).send("Database error")
    }

    console.log("✅ Stored assessment for user:", user_id)
    return res.status(200).send("OK")
  } catch (err: any) {
    console.error("💥 Handler crashed:", err)
    return res.status(500).send("Server error")
  }
})

// 5) catch any thrown errors
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("❌ Express error middleware:", err)
  res.status(500).send("Unexpected error")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Webhook listening on port ${PORT}`)
})
