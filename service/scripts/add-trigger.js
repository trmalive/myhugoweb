const ref = process.env.SUPABASE_REF || 'xthnmsxqzpyjydxhfxjh';
const pat = process.env.SUPABASE_PAT;
if (!pat) { console.error('请设置 SUPABASE_PAT'); process.exit(1); }

const statements = [
  `CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;`,

  `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`,

  `CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();`,
];

async function main() {
  for (const sql of statements) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    const t = await r.text();
    console.log(`[${r.status}] ${sql.substring(0, 60)}...`);
    if (!r.ok) console.log('  =>', t.substring(0, 100));
  }
}
main().catch(e => console.log(e.message));
