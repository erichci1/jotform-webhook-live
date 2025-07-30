// server.js
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// —————————————————————————————————————————————
//  Configure Supabase (Service Role Key for full inserts)
// —————————————————————————————————————————————
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// —————————————————————————————————————————————
//  Middleware
// —————————————————————————————————————————————
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// —————————————————————————————————————————————
//  Webhook endpoint
// —————————————————————————————————————————————
app.post('/', async (req, res) => {
  console.log('📥 Raw payload:', JSON.stringify(req.body, null, 2));

  // JotForm sometimes nests everything in rawRequest as a JSON string:
  let data;
  if (req.body.rawRequest) {
    try {
      data = JSON.parse(req.body.rawRequest);
    } catch (err) {
      console.error('❌ rawRequest JSON parse error:', err);
      return res.status(400).send('Invalid rawRequest');
    }
  } else {
    // Or fields may come in flat on req.body:
    data = req.body;
  }

  // —————————————————————————————————————
  //  Extract & validate user_id + email
  // —————————————————————————————————————
  const user_id =
    data.q189_user_id ||
    data.user_id ||
    null;
  const email =
    data.q12_email ||
    data.email ||
    null;

  if (!user_id || !email) {
    console.warn('⚠️ Missing user_id or email:', { user_id, email });
    return res.status(400).send('Missing user_id or email');
  }

  // —————————————————————————————————————
  //  Build your payload — adjust the field names
  //  to match your CSV and your new `assessment_results_2` schema
  // —————————————————————————————————————
  const payload = {
    user_id,
    email,
    q118_activate_percentage: data.q118_activate_percentage || null,
    q119_activate_category:   data.q119_activate_category   || null,
    q155_activate_insight:    data.q155_activate_insight    || null,
    q177_activate_yns:        data.q177_activate_yns        || null,
    q129_build_percentage:    data.q129_build_percentage    || null,
    q136_build_category:      data.q136_build_category      || null,
    q156_build_insight:       data.q156_build_insight       || null,
    q178_build_yns:           data.q178_build_yns           || null,
    q130_leverage_percentage: data.q130_leverage_percentage || null,
    q137_leverage_category:   data.q137_leverage_category   || null,
    q157_leverage_insight:    data.q157_leverage_insight    || null,
    q179_leverage_yns:        data.q179_leverage_yns        || null,
    q186_execute_percentage:  data.q186_execute_percentage  || null,
    q138_execute_category:    data.q138_execute_category    || null,
    q158_execute_insight:     data.q158_execute_insight     || null,
    q180_execute_yns:         data.q180_execute_yns         || null,
    q133_final_percentage:    data.q133_final_percentage    || null,
    q159_final_summary_insight: data.q159_final_summary_insight || null,
    q188_final_summary_yns:     data.q188_final_summary_yns     || null,
    submission_date:          new Date().toISOString(),
    raw_submission:           JSON.stringify(data),
  };

  // —————————————————————————————————————
  //  Insert into Supabase
  // —————————————————————————————————————
  const { error } = await supabase
    .from('assessment_results_2')
    .insert([payload]);

  if (error) {
    console.error('❌ Supabase insert error:', error);
    return res.status(500).send('Insert failed');
  }

  console.log('✅ Insert succeeded for', email);
  res.status(200).send('OK');
});

// —————————————————————————————————————————————
//  Start server
// —————————————————————————————————————————————
app.listen(port, () => {
  console.log(`🚀 Webhook server listening on port ${port}`);
});
