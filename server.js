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
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // your full anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

app.post("/", async (req, res) => {
  try {
    console.log("📥 Raw Submission Received:\n", JSON.stringify(req.body, null, 2))

    const rawRequest = req.body.rawRequest
    if (!rawRequest) throw new Error("Missing rawRequest from Jotform")

    const parsedData = JSON.parse(rawRequest)
    const userId = parsedData.user_id

    if (!userId) {
      throw new Error("Missing user_id in submitted data")
    }

    // 🌱💧 Water the seed: update existing row
    const { data, error } = await supabase
      .from("assessment_results")
      .update({
        name: parsedData.q11_Name
          ? `${parsedData.q11_Name.first ?? ""} ${parsedData.q11_Name.last ?? ""}`
          : parsedData.pretty?.match(/Name:([^,]+)/)?.[1]?.trim() ?? null,
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

        status: "assessment_completed",
        submission_date: new Date().toISOString(),
      })
      .eq("user_id", userId)

    if (error) {
      console.error("❌ Supabase update error:", error)
      return res.status(500).send("Update failed.")
    }

    console.log("✅ Seed watered. Row updated successfully:", data)
    res.status(200).send("OK")
  } catch (err) {
    console.error("❌ Webhook error:", err.message)
    res.status(500).send("Internal Server Error")
  }
})

app.listen(port, () => {
  console.log(`🚀 Webhook server running at http://localhost:${port}`)
})
