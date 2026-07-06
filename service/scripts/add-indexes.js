const ref = 'xthnmsxqzpyjydxhfxjh';
const pat = process.env.SUPABASE_PAT;
if (!pat) { console.error('请设置 SUPABASE_PAT'); process.exit(1); }

const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_orders_out_trade_no ON orders(out_trade_no)',
  'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
  'CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)',
  'CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)',
  'CREATE INDEX IF NOT EXISTS idx_reviews_article_id ON reviews(article_id)',
];

async function main() {
  for (const sql of indexes) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    const t = await r.text();
    console.log(`[${r.status}] ${sql.substring(0, 55)}...`);
    if (!r.ok) console.log('  =>', t.substring(0, 100));
  }
}
main().catch(e => console.log(e.message));
