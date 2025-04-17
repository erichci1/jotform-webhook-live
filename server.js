import express from "express"
import bodyParser from "body-parser"
import multer from "multer"
import { createClient } from "@supabase/supabase-js"

const app = express()
const port = 3000
const upload = multer()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(upload.none())

const SUPABASE_URL = "https://srkuufwbwqipohhcmqmu.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3V1Zndid3FpcG9oaGNtcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTA1MDYsImV4cCI6MjA1ODY4NjUwNn0.XuN_eG8tEl1LQp84XK1HwwksWsyc41L_xeqbxh-fM-8"
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

app.post("/", async (req, res) => {
  try {
    console.log("📥 Raw Submission:\n", JSON.stringify(req.body, null, 2))

    const rawRequest = req.body.rawRequest
    if (!rawRequest) {
      throw new Error("Missing rawRequest from JotForm webhook")
    }

    const parsedData = JSON.parse(rawRequest)

    const submission = {
      user_id: parsedData.user_id ?? null,
      email: parsedData.q12_Email ?? "",

      activate_percentage: parsedData.q187_activate_percentage ?? "",
      activate_category: parsedData.q134_activate_category ?? "",
      activate_insight: parsedData.q155_activate_insight ?? "",
      activate_yns: parsedData.q177_activate_yns ?? "",

      build_percentage: parsedData.q129_build_percentage ?? "",
      build_category: parsedData.q136_build_category ?? "",
      build_insight: parsedData.q156_build_insight ?? "",
      build_yns: parsedData.q178_build_yns ?? "",

      leverage_percentage: parsedData.q130_leverage_percentage ?? "",
      leverage_category: parsedData.q137_leverage_category ?? "",
      leverage_insight: parsedData.q157_leverage_insight ?? "",
      leverage_yns: parsedData.q179_leverage_yns ?? "",

      execute_percentage: parsedData.q186_execute_percentage ?? "",
      execute_category: parsedData.q138_execute_category ?? "",
      execute_insight: parsedData.q158_execute_insight ?? "",
      execute_yns: parsedData.q180_execute_yns ?? "",

      final_percentage: parsedData.q133_final_percentage ?? "",
      final_summary_insight: parsedData.q159_final_summary_insight ?? "",
      final_summary_yns: parsedData.q188_final_summary_yns ?? "",

      submission_date: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("assessment_results").insert([submission])

    if (error) {
      console.error("❌ Supabase insert error:", error)
      return res.status(500).send("Insert failed.")
    }

    console.log("✅ Submission saved:", data)
    res.status(200).send("OK")
  } catch (err) {
    console.error("❌ Server error:", err)
    res.status(500).send("Internal Server Error")
  }
})

app.listen(port, () => {
  console.log(`🚀 Webhook server running at http://localhost:${port}`)
})
