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
  name:
    parsedData.q11_Name
      ? `${parsedData.q11_Name.first ?? ""} ${parsedData.q11_Name.last ?? ""}`
      : parsedData.pretty?.match(/Name:([^,]+)/)?.[1]?.trim() ?? null,
  email: parsedData.email ?? parsedData.q12_Email ?? "",

  activate_percentage: parsedData.Activate_Percentage ?? "",
  activate_category: parsedData.Activate_Category ?? "",
  activate_insight: parsedData.Activate_WTM ?? "",
  activate_yns: parsedData.Activate_YNS ?? "",

  build_percentage: parsedData.Build_Percentage ?? "",
  build_category: parsedData.Build_Category ?? "",
  build_insight: parsedData.Build_WTM ?? "",
  build_yns: parsedData.Build_YNS ?? "",

  leverage_percentage: parsedData.Leverage_Percentage ?? "",
  leverage_category: parsedData.Leverage_Category ?? "",
  leverage_insight: parsedData.Leverage_WTM ?? "",
  leverage_yns: parsedData.Leverage_YNS ?? "",

  execute_percentage: parsedData.Execute_Percentage ?? "",
  execute_category: parsedData.Execute_Category ?? "",
  execute_insight: parsedData.Execute_WTM ?? "",
  execute_yns: parsedData.Execute_YNS ?? "",

  final_percentage: parsedData.Final_Percentage ?? "",
  final_summary_insight: parsedData.Final_Summary_WTM ?? "",
  final_summary_yns: parsedData.Final_Summary_YNS ?? "",

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
