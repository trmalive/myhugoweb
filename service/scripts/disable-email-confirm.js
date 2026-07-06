const ref = process.env.SUPABASE_REF || 'xthnmsxqzpyjydxhfxjh';
const pat = process.env.SUPABASE_PAT;
if (!pat) { console.error('请设置 SUPABASE_PAT'); process.exit(1); }

fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  headers: { 'Authorization': `Bearer ${pat}` },
}).then(r => r.json()).then(d => {
  console.log('mailer_autoconfirm:', d.mailer_autoconfirm);
  console.log('site_url:', d.site_url);
}).catch(e => console.log(e.message));
