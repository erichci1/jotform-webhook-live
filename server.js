import express from "express"
import { createClient } from "@supabase/supabase-js"

const app = express()
app.use(express.json())

// pull from the same env var names you set on Render:
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

app.post("/", async (req, res) => {
  const {
    customParams = {},        // ← JotForm puts URL params here
    rawRequest: submission,   // ← All the answers live here
  } = req.body

  const user_id = customParams.user_id
  const email   = customParams.email

  if (!user_id || !email) {
    console.warn("⚠️ Missing user_id or email:", { user_id, email })
    return res.status(400).json({ error: "Missing user_id or email." })
  }

  // now you can upsert the results tied to that user
  const { error } = await supabase
    .from("assessments")
    .insert({
      user_id,
      email,
      data: submission,     // or pick & choose fields
    })

  if (error) {
    console.error("Supabase insert error:", error)
    return res.status(500).json({ error: error.message })
  }

  res.json({ status: "ok" })
})

const port = process.env.PORT || 10000
app.listen(port, () => {
  console.log(`🚀 Webhook server listening on port ${port}`)
})
