// server.js
import express from "express"
import bodyParser from "body-parser"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

// bodyParser + JSON payloads
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// Initialize Supabase (Service Role key for server‑side writes)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

app.post("/", async (req, res) => {
  // 1) Dump the raw payload for debugging
  console.log("📥 Full incoming payload:", JSON.stringify(req.body, null, 2))

  // 2) Pull out the two required pieces
  const email    = req.body.q12_email
  const user_id  = req.body.q189_user_id

  if (!email || !user_id) {
    console.warn("! Missing user_id or email:", { user_id, email })
    return res.status(400).send("Missing user_id or email")
  }

  // 3) Build the rest of your payload from whatever q### fields you need
  const payload = {
    user_id,
    email,
    activate_percentage: req.body.q118_activate_percentage || null,
    activate_category:   req.body.q119_activate_category   || null,
    // …and so on for all the other q### fields you care about…
    submission_date: new Date().toISOString(),
  }

  // 4) Insert into Supabase
  const { error } = await supabase
    .from("assessment_results")
    .insert([payload])

  if (error) {
    console.error("❌ Supabase insert error:", error)
    return res.status(500).send("Insert failed")
  }

  console.log("✅ Inserted payload:", payload)
  return res.status(200).send("OK")
})

app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`)
})
