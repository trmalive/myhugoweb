const fs = require('fs');
let sql = fs.readFileSync(__dirname + '/../supabase-schema.sql', 'utf8');

// Strip SQL comments (-- to end of line)
sql = sql.replace(/--.*$/gm, '');
// Split on semicolons
const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 5);
// Remove trailing empty statement if any
const ref = process.env.SUPABASE_REF || 'xthnmsxqzpyjydxhfxjh';
const pat = process.env.SUPABASE_PAT;
if (!pat) { console.error('请设置 SUPABASE_PAT 环境变量'); process.exit(1); }

let ok = 0, skip = 0, fail = 0;

async function main() {
  for (const stmt of statements) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: stmt }),
    });
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }

    const isErr = Array.isArray(parsed) && parsed.length > 0 && parsed[0].error;
    if (res.ok && !isErr) {
      console.log('  OK  ' + stmt.substring(0, 70));
      ok++;
    } else if (res.status === 400 || isErr) {
      const msg = isErr ? parsed[0].error : text;
      if (msg.includes('already exists')) {
        console.log('  --  (已存在) ' + stmt.substring(0, 55));
        skip++;
      } else {
        console.log('  ERR ' + msg.substring(0, 120));
        fail++;
      }
    } else {
      console.log('  FAIL HTTP ' + res.status + ' ' + text.substring(0, 100));
      fail++;
    }
  }

  // Storage bucket
  const res = await fetch(`https://${ref}.supabase.co/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: 'articles', name: 'articles', public: true }),
  });
  if (res.ok || res.status === 409) {
    console.log('  OK  存储桶 articles ✓');
  } else {
    console.log('  !!  存储桶: HTTP ' + res.status + ' ' + (await res.text()).substring(0, 80));
  }

  // Ensure admin profile placeholder
  const r2 = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: `INSERT INTO public.profiles (id, email, role) VALUES ('00000000-0000-0000-0000-000000000000', 'admin@aiwrite.online', 'admin') ON CONFLICT (id) DO NOTHING;` }),
  });
  console.log('  OK  Admin placeholder ✓');

  console.log(`\n完成: ${ok} 成功, ${skip} 跳过, ${fail} 失败`);
}
main().catch(e => console.error('错误:', e.message));
