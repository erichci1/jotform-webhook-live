// server.js
require('dotenv').config();

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post('/', async (req, res) => {
  try {
    console.log('Received payload:', req.body);

    // JotForm sends a stringified blob of the real answers in rawRequest
    const raw = req.body.rawRequest;
    const data = raw ? JSON.parse(raw) : req.body;

    // map your fields — adjust q‑numbers as needed
    const payload = {
      user_id: data.q189_user_id ?? null,
      email:   data.q12_email       ?? '',
      name:    `${data.q11_name?.first ?? ''} ${data.q11_name?.last ?? ''}`.trim(),
      activate_percentage: data.q118_activate_percentage ?? '',
      activate_category:   data.q119_activate_category   ?? '',
      // …repeat for all the other q### fields…
      submission_date: data.submissionDate ?? new Date().toISOString(),
    };

    console.log('Mapped payload:', payload);

    if (!payload.user_id || !payload.email) {
      console.warn('Missing user_id or email:', {
        user_id: payload.user_id,
        email:   payload.email,
      });
      return res.status(400).send('Missing user_id or email');
    }

    const { error } = await supabase
      .from('assessment_results')
      .insert([payload]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).send('Insert failed');
    }

    console.log('☑️ Insert succeeded');
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Listening on port ${PORT}`);
});
