// server.js
import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

app.post("/", async (req, res) => {
  console.log("📥 Raw payload:", req.body);

  // pull out exactly the Jotform field names → DB columns
  const {
    q189_user_id: user_id,
    q12_email: email,

    q118_activate_percentage: activate_percentage,
    q119_activate_category: activate_category,
    q155_activate_insight: activate_insight,
    q177_activate_yns: activate_yns,

    q129_build_percentage: build_percentage,
    q136_build_category: build_category,
    q156_build_insight: build_insight,
    q178_build_yns: build_yns,

    q130_leverage_percentage: leverage_percentage,
    q137_leverage_category: leverage_category,
    q157_leverage_insight: leverage_insight,
    q179_leverage_yns: leverage_yns,

    q186_execute_percentage: execute_percentage,
    q138_execute_category: execute_category,
    q158_execute_insight: execute_insight,
    q180_execute_yns: execute_yns,

    q133_final_percentage: final_percentage,
    q159_final_summary_insight: final_summary_insight,
    q188_final_summary_yns: final_summary_yns,
  } = req.body;

  if (!user_id || !email) {
    console.warn("Missing user_id or email:", { user_id, email });
    return res.status(400).send("Missing user_id or email");
  }

  const payload = {
    user_id,
    email,
    activate_percentage: parseInt(activate_percentage, 10) || null,
    activate_category,
    activate_insight,
    activate_yns,

    build_percentage: parseInt(build_percentage, 10) || null,
    build_category,
    build_insight,
    build_yns,

    leverage_percentage: parseInt(leverage_percentage, 10) || null,
    leverage_category,
    leverage_insight,
    leverage_yns,

    execute_percentage: parseInt(execute_percentage, 10) || null,
    execute_category,
    execute_insight,
    execute_yns,

    final_percentage: parseInt(final_percentage, 10) || null,
    final_summary_insight,
    final_summary_yns,
  };

  const { data, error } = await supabase
    .from("assessment_results_2")
    .insert([payload]);

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).send("Insert failed");
  }

  console.log("✅ Inserted:", data);
  res.status(200).send("OK");
});

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`);
});
