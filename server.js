// server.js
import express from "express"
import multer from "multer"
import { createClient } from "@supabase/supabase-js"

const app = express()
const upload = multer()   // parse all multipart fields into req.body

// initialize Supabase client from env
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

app.post("/", upload.any(), async (req, res) => {
  const { user_id, email, ...payload } = req.body

  if (!user_id || !email) {
    console.warn("Missing user_id or email:", { user_id, email })
    return res.status(400).send("Missing user_id or email")
  }

  // insert one row into `assessments`
  const { error } = await supabase
    .from("assessments")
    .insert([
      {
        user_id,
        email,
        submission: payload,   // all the other JotForm fields
      },
    ])

  if (error) {
    console.error("Supabase insert error:", error)
    return res.status(500).send("DB error")
  }

  res.send("OK")
})

const port = process.env.PORT || 10000
app.listen(port, () => {
  console.log("⚡ Webhook server listening on port", port)
})
