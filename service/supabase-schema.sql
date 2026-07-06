-- 进入 Supabase SQL Editor 后执行以下全部 SQL

-- 1. 用户扩展表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 允许用户读自己的 profile，管理员读所有
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "service_role_insert_profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- 2. 订单表
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single', '3month', '6month', '12month', 'test')),
  amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'used', 'refunded', 'expired')),
  out_trade_no TEXT,
  alipay_trade_no TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_orders" ON orders
  FOR SELECT USING (auth.uid() = user_id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "service_role_all_orders" ON orders
  FOR ALL USING (true) WITH CHECK (true);

-- 3. 订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders ON DELETE SET NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('3month', '6month', '12month')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  max_concurrent INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "service_role_all_subscriptions" ON subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- 4. 稿件表
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  order_id UUID REFERENCES orders ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'reviewed', 'closed')),
  current_round INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_articles" ON articles
  FOR SELECT USING (auth.uid() = user_id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "users_insert_own_articles" ON articles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_articles" ON articles
  FOR UPDATE USING (auth.uid() = user_id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 5. 审稿记录表
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES articles ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  review_notes TEXT,
  reviewer_file_path TEXT,
  reviewer_file_name TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_reviews" ON reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM articles WHERE articles.id = reviews.article_id AND articles.user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "service_role_all_reviews" ON reviews
  FOR ALL USING (true) WITH CHECK (true);

-- 6. 注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
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
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. 索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_out_trade_no ON orders(out_trade_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_reviews_article_id ON reviews(article_id);

-- 8. Storage bucket
-- INSERT INTO storage.buckets (id, name, public) VALUES ('articles', 'articles', true);
