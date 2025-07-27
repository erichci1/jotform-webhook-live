// server.js
import express from "express"
import multer from "multer"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

// 1) Load .env into process.env
dotenv.config()

// 2) Pull creds from env
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY

// 3) Fail early if missing
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("🔥 Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment")
  process.exit(1)
}

// 4) Create your Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 5) Set up Express + Multer for parsing JotForm webhooks
const app = express()
const upload = multer()

app.post(
  "/",
  upload.none(),            // parse form‑encoded bodies
  async (req, res, next) => {
    try {
      const payload = req.body
      console.log("🔑 Received keys:", Object.keys(payload))

      // grab the user_id or email you passed as a hidden field in the JotForm
      const user_id = payload.user_id || null
      const email   = payload.email   || null

      if (!user_id && !email) {
        console.warn("⚠️ Missing user_id or email:", { user_id, email })
        return res.status(400).send("Missing user_id or email")
      }

      // write the submission to your `assessments` table (example)
      const { error } = await supabase
        .from("assessments")
        .insert({
          user_id,
          email,
          raw: payload,            // store entire payload for now
          submitted_at: new Date(),
        })

      if (error) {
        console.error("❌ Supabase insert error:", error)
        return res.status(500).send("DB error")
      }

      console.log("✅ Inserted assessment for", user_id || email)
      res.send("OK")
    } catch (err) {
      next(err)
    }
  }
)

// 6) Kick off the server
const PORT = process.env.PORT || 10000
app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`)
})
