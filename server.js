// server.js (ESM)
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer().none();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('🚨 Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/', upload, async (req, res) => {
  console.log('📥 Payload:', req.body);
  let data = req.body;
  if (typeof req.body.rawRequest === 'string') {
    try {
      data = JSON.parse(req.body.rawRequest);
      if (typeof data === 'string') data = JSON.parse(data);
    } catch {
      return res.status(400).send('Bad rawRequest payload');
    }
  }

  const user_id = data.q189_user_id;
  const email   = data.q12_email;
  if (!user_id || !email) return res.status(400).send('Missing user_id or email');

  const payload = {
    user_id,
    email,
    submission_date:     data.submissionDate || new Date().toISOString(),
    name:                `${data.q11_name?.first || ''} ${data.q11_name?.last || ''}`.trim(),
    activate_percentage: data.q118_activate_percentage || '',
    activate_category:   data.q119_activate_category   || '',
    activate_wtm:        data.q120_activate_wtm        || '',
    activate_yns:        data.q121_activate_yns        || '',
    build_percentage:    data.q122_build_percentage    || '',
    build_category:      data.q123_build_category      || '',
    build_wtm:           data.q124_build_wtm           || '',
    build_yns:           data.q125_build_yns           || '',
    leverage_percentage: data.q126_leverage_percentage || '',
    leverage_category:   data.q127_leverage_category   || '',
    leverage_wtm:        data.q128_leverage_wtm        || '',
    leverage_yns:        data.q129_leverage_yns        || '',
    execute_percentage:  data.q130_execute_percentage  || '',
    execute_category:    data.q131_execute_category    || '',
    execute_wtm:         data.q132_execute_wtm         || '',
    execute_yns:         data.q133_execute_yns         || '',
    final_percentage:    data.q134_final_percentage    || '',
    final_summary_wtm:   data.q135_final_summary_wtm   || '',
    final_summary_yns:   data.q136_final_summary_yns   || ''
  };

  console.log('📤 Inserting:', payload);
  const { error } = await supabase.from('assessment_results_2').insert([payload]);
  if (error) return res.status(500).send('Insert failed');

  console.log('✅ Insert succeeded');
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`🚀 Listening on port ${PORT}`);
});
