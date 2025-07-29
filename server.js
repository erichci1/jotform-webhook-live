// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// pull your Supabase creds from .env
const SUPABASE_URL           = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// guard against missing env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// init supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// parse JSON and URL‑encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/', async (req, res) => {
  console.log('📥 Raw payload:', JSON.stringify(req.body));

  // pull out the two required fields
  const { 
    q189_user_id: user_id,
    q12_email: email,
    q118_activate_percentage,
    q119_activate_category,
    q179_leverage_yns,
    /* … add all your other qXXX fields here … */
  } = req.body;

  if (!user_id || !email) {
    console.warn('⚠️ Missing user_id or email:', { user_id, email });
    return res.status(400).send('Missing user_id or email');
  }

  // build the row to insert, mapping q‑fields → your DB columns
  const row = {
    user_id,
    email,
    activate_percentage: q118_activate_percentage || null,
    activate_category:   q119_activate_category   || null,
    leverage_yns:        q179_leverage_yns        || null,
    // … continue for each field from your CSV …
    raw_payload: JSON.stringify(req.body),
    submission_date: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('assessment_results_2')
      .insert([row]);

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return res.status(500).send('Insert failed');
    }

    console.log('✅ Inserted row:', row);
    res.send('OK');
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`🚀 Webhook server listening on port ${port}`);
});
