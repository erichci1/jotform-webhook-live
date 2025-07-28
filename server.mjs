// server.cjs
import express      from "express";
import bodyParser   from "body-parser";
import { createClient } from "@supabase/supabase-js";

const app  = express();
const port = process.env.PORT || 10000;

// replace these with your real values
const supabaseUrl          = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post("/", async (req, res) => {
  try {
    // Jotform sometimes posts a top‑level `rawRequest` JSON blob
    // or uses the classic answers[...] structure
    const body = req.body;
    let formData;

    if (body.rawRequest) {
      // parse the entire JSON string
      const parsed = JSON.parse(body.rawRequest);
      formData = parsed.answers || parsed;
    } else if (body.answers) {
      formData = body.answers;
    } else {
      formData = body;
    }

    // pull out user_id & email under either schema
    const user_id = formData["q189_user_id"]?.answer     // Jotform “answer” style
                  || formData["q189_user_id"]           // or top‑level
                  || formData["user_id"]?.answer
                  || formData["user_id"]
                  || null;

    const email   = formData["q12_email"]?.answer
                  || formData["q12_email"]
                  || formData["email"]?.answer
                  || formData["email"]
                  || "";

    // now build your payload.  Adjust the rest of these keys
    // to point at whatever q###_… fields you need
    const payload = {
      user_id,
      email,
      submission_date: body.submissionDate || new Date().toISOString(),

      activate_percentage: formData["q118_activate_percentage"]?.answer || formData["q118_activate_percentage"] || "",
      activate_category:   formData["q118_activate_category"]?.answer   || formData["q118_activate_category"]   || "",
      activate_wtm:        formData["q118_activate_wtm"]?.answer        || formData["q118_activate_wtm"]        || "",
      activate_yns:        formData["q118_activate_yns"]?.answer        || formData["q118_activate_yns"]        || "",

      build_percentage:    formData["q129_build_percentage"]?.answer    || formData["q129_build_percentage"]    || "",
      build_category:      formData["q129_build_category"]?.answer      || formData["q129_build_category"]      || "",
      build_wtm:           formData["q129_build_wtm"]?.answer           || formData["q129_build_wtm"]           || "",
      build_yns:           formData["q129_build_yns"]?.answer           || formData["q129_build_yns"]           || "",

      leverage_percentage: formData["q179_leverage_percentage"]?.answer || formData["q179_leverage_percentage"] || "",
      leverage_category:   formData["q179_leverage_category"]?.answer   || formData["q179_leverage_category"]   || "",
      leverage_wtm:        formData["q179_leverage_wtm"]?.answer        || formData["q179_leverage_wtm"]        || "",
      leverage_yns:        formData["q179_leverage_yns"]?.answer        || formData["q179_leverage_yns"]        || "",

      execute_percentage:  formData["q187_execute_percentage"]?.answer  || formData["q187_execute_percentage"]  || "",
      execute_category:    formData["q187_execute_category"]?.answer    || formData["q187_execute_category"]    || "",
      execute_wtm:         formData["q187_execute_wtm"]?.answer         || formData["q187_execute_wtm"]         || "",
      execute_yns:         formData["q187_execute_yns"]?.answer         || formData["q187_execute_yns"]         || "",

      final_percentage:    formData["q196_final_percentage"]?.answer    || formData["q196_final_percentage"]    || "",
      final_summary_wtm:   formData["q196_final_summary_wtm"]?.answer   || formData["q196_final_summary_wtm"]   || "",
      final_summary_yns:   formData["q196_final_summary_yns"]?.answer   || formData["q196_final_summary_yns"]   || "",
    };

    // write to Supabase
    const { error } = await supabase
      .from("assessment_results")
      .insert([payload]);

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).send("Insert failed");
    }

    console.log("✅ inserted", payload);
    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log(`🚀 Webhook server listening on port ${port}`);
});
