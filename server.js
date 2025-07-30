// server.js
require('dotenv').config();
const express    = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app  = express();
const port = process.env.PORT || 3000;

// initialise Supabase client with your Service Role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// parse both JSON and x-www-form-urlencoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.post('/', async (req, res) => {
  try {
    // JotForm will send you fields like q12_email, q189_user_id, etc.
    const data = req.body || {};

    const payload = {
      user_id:             data.q189_user_id               || null,
      submission_date:     new Date().toISOString(),
      name:                `${data.q11_name_first||''} ${data.q11_name_last||''}`.trim(),
      email:               data.q12_email                  || '',
      activate_percentage: data.q118_activate_percentage    || '',
      activate_category:   data.q119_activate_category      || '',
      activate_wtm:        data.q120_activate_wtm           || '',
      activate_yns:        data.q121_activate_yns           || '',
      build_percentage:    data.q122_build_percentage       || '',
      build_category:      data.q123_build_category         || '',
      build_wtm:           data.q124_build_wtm              || '',
      build_yns:           data.q125_build_yns              || '',
      leverage_percentage: data.q126_leverage_percentage    || '',
      leverage_category:   data.q127_leverage_category      || '',
      leverage_wtm:        data.q128_leverage_wtm           || '',
      leverage_yns:        data.q129_leverage_yns           || '',
      execute_percentage:  data.q130_execute_percentage     || '',
      execute_category:    data.q131_execute_category       || '',
      execute_wtm:         data.q132_execute_wtm            || '',
      execute_yns:         data.q133_execute_yns            || '',
      final_percentage:    data.q134_final_percentage       || '',
      final_summary_wtm:   data.q135_final_summary_wtm      || '',
      final_summary_yns:   data.q136_final_summary_yns      || ''
    };

    if (!payload.user_id || !payload.email) {
      console.warn('Missing user_id or email', payload);
      return res.status(400).send('Missing user_id or email');
    }

    const { error } = await supabase
      .from('assessment_results_2')
      .insert([payload]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).send('Insert failed');
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`);
});
