// server.js
require('dotenv').config();
const express    = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app  = express();
const port = process.env.PORT || 3000;

// read your supabase creds from .env
const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// JotForm webhooks post as urlencoded by default
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/', async (req, res) => {
  // JotForm puts the entire submission JSON into rawRequest
  const raw = req.body.rawRequest;
  console.log('📥 Raw JotForm payload:', raw);

  if (!raw) {
    console.warn('⚠️ No rawRequest found on req.body:', req.body);
    return res.status(400).send('Missing rawRequest');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error('❌ Could not JSON.parse rawRequest:', err);
    return res.status(400).send('Invalid rawRequest');
  }

  // now extract your q### answers:
  const {
    q189_user_id: user_id,
    q12_email:     email,
    q118_activate_percentage,
    q119_activate_category,
    q129_build_percentage,
    q136_build_category,
    // …etc for each field you need…
  } = parsed;

  if (!user_id || !email) {
    console.warn('⚠️ Missing user_id or email:', { user_id, email });
    return res.status(400).send('Missing user_id or email');
  }

  // map to your new table's columns:
  const row = {
    user_id,
    email,
    activate_percentage: q118_activate_percentage || null,
    activate_category:   q119_activate_category   || null,
    build_percentage:    q129_build_percentage    || null,
    build_category:      q136_build_category      || null,
    // …continue for all your fields…
    raw_payload: raw,
    submission_date: new Date().toISOString()
  };

  const { error } = await supabase
    .from('assessment_results_2')
    .insert([row]);

  if (error) {
    console.error('❌ Supabase insert error:', error);
    return res.status(500).send('Insert failed');
  }

  console.log('✅ Inserted:', row);
  res.send('OK');
});

app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`);
});
