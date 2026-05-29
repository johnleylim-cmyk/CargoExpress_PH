-- ============================================================
-- CargoExpress PH — Complete Supabase PostgreSQL Schema
-- Single source-of-truth for the entire database.
-- Matches the LIVE database as of 2026-05-23
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ===================== 1. PROFILES =====================
-- Linked to Supabase auth.users via id (UUID)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  address_lot_block VARCHAR(255) DEFAULT NULL,
  address_street VARCHAR(255) DEFAULT NULL,
  address_barangay VARCHAR(255) DEFAULT NULL,
  address_city VARCHAR(255) DEFAULT NULL,
  address_province VARCHAR(255) DEFAULT NULL,
  role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  -- Contact & social
  facebook_name TEXT DEFAULT NULL,
  address_landmark TEXT DEFAULT NULL,
  smart_phone TEXT DEFAULT NULL,
  globe_phone TEXT DEFAULT NULL,
  facebook_link TEXT DEFAULT NULL,
  manila_address TEXT DEFAULT NULL,
  bohol_address TEXT DEFAULT NULL,
  -- Push notifications (FCM)
  fcm_token TEXT DEFAULT NULL,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ===================== 2. TRIPS =====================
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_number VARCHAR(50) UNIQUE NOT NULL,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  departure_date TIMESTAMPTZ NOT NULL,
  arrival_date TIMESTAMPTZ DEFAULT NULL,
  vehicle_info VARCHAR(100) DEFAULT NULL,
  driver_name VARCHAR(100) DEFAULT NULL,
  driver_phone VARCHAR(20) DEFAULT NULL,
  capacity INTEGER DEFAULT 0,
  available_slots INTEGER DEFAULT 0,
  price_per_kg DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'arrived', 'completed', 'cancelled')),
  notes TEXT DEFAULT NULL,
  created_by UUID DEFAULT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ===================== 3. ORDERS =====================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id UUID DEFAULT NULL REFERENCES trips(id) ON DELETE SET NULL,
  origin VARCHAR(100) DEFAULT NULL,
  destination VARCHAR(100) DEFAULT NULL,
  tracking_number VARCHAR(50) UNIQUE NOT NULL,
  -- Sender info
  sender_name VARCHAR(100) NOT NULL,
  sender_phone VARCHAR(20) NOT NULL,
  sender_address TEXT NOT NULL,
  sender_province TEXT DEFAULT NULL,
  sender_city TEXT DEFAULT NULL,
  sender_facebook TEXT DEFAULT NULL,
  -- Receiver info
  receiver_name VARCHAR(100) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  receiver_address TEXT NOT NULL,
  receiver_province TEXT DEFAULT NULL,
  receiver_city TEXT DEFAULT NULL,
  receiver_facebook TEXT DEFAULT NULL,
  -- Package info
  package_description TEXT,
  package_weight DECIMAL(10,2) DEFAULT 0,
  actual_weight DECIMAL(10,2) DEFAULT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  -- Payment info
  payer_type VARCHAR(20) DEFAULT NULL CHECK (payer_type IN ('sender', 'receiver')),
  payment_method VARCHAR(20) DEFAULT NULL CHECK (payment_method IN ('cash', 'gcash', 'paylater')),
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  remaining_balance DECIMAL(10,2) DEFAULT 0.00,
  promised_payment_date DATE DEFAULT NULL,
  payment_reference VARCHAR(255) DEFAULT NULL,
  -- Pickup & delivery proof (photo arrays)
  pickup_photos JSONB DEFAULT '[]'::jsonb,
  delivery_photos JSONB DEFAULT '[]'::jsonb,
  -- Status & meta
  status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN (
    'Pending', 'Assigned', 'Picked Up', 'In Transit',
    'Arrived at Hub', 'Out for Delivery', 'Delivered', 'Completed', 'Cancelled'
  )),
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ===================== 4. ANNOUNCEMENTS =====================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  author_id UUID DEFAULT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ===================== 5. NOTIFICATIONS =====================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) DEFAULT 'general' CHECK (type IN ('order_update', 'trip_update', 'announcement', 'general')),
  reference_id UUID DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ===================== 6. GLOBAL SETTINGS =====================
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ===================== 7. CONVERSATIONS (Chat Support) =====================
-- One conversation per customer — enforced by UNIQUE constraint
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ===================== 8. CHAT MESSAGES =====================
-- Linked to conversations, supports customer ↔ admin messaging
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ===================== 9. CONTACT INQUIRIES =====================
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT DEFAULT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- DEFAULT DATA
-- ============================================================
INSERT INTO global_settings (setting_key, setting_value)
VALUES ('price_per_kilo', '70.00')
ON CONFLICT (setting_key) DO NOTHING;


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ────────────────────────────────────────────────
-- Users can read all profiles, update/insert own
CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── Trips ───────────────────────────────────────────────────
-- Everyone can read, admins can manage
CREATE POLICY "Anyone can view trips" ON trips
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage trips" ON trips
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── Orders ──────────────────────────────────────────────────
-- Users see own, admins see all; users create own; admins update/delete
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update orders" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete orders" ON orders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── Announcements ──────────────────────────────────────────
-- Everyone reads, admins manage
CREATE POLICY "Anyone can view announcements" ON announcements
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── Notifications ──────────────────────────────────────────
-- Users see/update own, system can insert
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- ─── Global Settings ────────────────────────────────────────
-- Everyone reads, admins write
CREATE POLICY "Anyone can view settings" ON global_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update settings" ON global_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert settings" ON global_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── Conversations ──────────────────────────────────────────
-- Customers see own, admins see all; customers create own
CREATE POLICY "Customers view own conversations" ON conversations
  FOR SELECT USING (
    customer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Customers insert own conversations" ON conversations
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- ─── Chat Messages ──────────────────────────────────────────
-- Users see/insert messages in conversations they belong to; admins can update
CREATE POLICY "Users view messages in allowed conversations" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = chat_messages.conversation_id AND (
        customer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Users insert messages in allowed conversations" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = chat_messages.conversation_id AND (
        customer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Admins update messages" ON chat_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Guard: enforce sender_role matches the authenticated user's actual role
CREATE OR REPLACE FUNCTION public.guard_chat_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actual_role TEXT;
BEGIN
  SELECT role INTO actual_role FROM public.profiles WHERE id = auth.uid();
  IF actual_role IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  NEW.sender_id := auth.uid();
  NEW.sender_role := actual_role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_guard_insert ON chat_messages;
CREATE TRIGGER chat_messages_guard_insert
  BEFORE INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_chat_message_insert();

-- ─── Contact Inquiries ──────────────────────────────────────
-- Anyone can insert (public form), admins can view/manage
CREATE POLICY "Anyone can submit contact inquiry" ON contact_inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view contact inquiries" ON contact_inquiries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update contact inquiries" ON contact_inquiries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- INDEXES (Performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_trip_id ON orders(trip_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON profiles(fcm_token) WHERE fcm_token IS NOT NULL;


-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;


-- ============================================================
-- PRODUCTION HARDENING
-- Apply after the base schema. This replaces permissive MVP policies
-- and adds server-side guards for roles, orders, storage, and reports.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.safe_uuid(value TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN value::UUID;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_uuid(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      NEW.role := 'customer';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.id := OLD.id;
    NEW.email := OLD.email;
    NEW.role := OLD.role;
    NEW.created_at := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_write ON profiles;
CREATE TRIGGER profiles_guard_write
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_write();

CREATE OR REPLACE FUNCTION public.generate_order_tracking_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := 'CE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || FLOOR(1000 + RANDOM() * 9000)::INT;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE tracking_number = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_trip_weight(p_trip_id UUID, p_exclude_order_id UUID DEFAULT NULL)
RETURNS NUMERIC
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(COALESCE(actual_weight, package_weight, 0)), 0)
  FROM public.orders
  WHERE trip_id = p_trip_id
    AND status <> 'Cancelled'
    AND (p_exclude_order_id IS NULL OR id <> p_exclude_order_id);
$$;

CREATE OR REPLACE FUNCTION public.global_price_per_kilo()
RETURNS NUMERIC
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT setting_value::NUMERIC FROM public.global_settings WHERE setting_key = 'price_per_kilo' LIMIT 1),
    70
  );
$$;

CREATE OR REPLACE FUNCTION public.effective_trip_price(p_trip_id UUID)
RETURNS NUMERIC
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT NULLIF(price_per_kg, 0) FROM public.trips WHERE id = p_trip_id),
    public.global_price_per_kilo()
  );
$$;

CREATE OR REPLACE FUNCTION public.prepare_order_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_row public.trips%ROWTYPE;
  weight NUMERIC;
  price NUMERIC;
  next_weight NUMERIC;
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Cannot create orders for another user';
  END IF;

  weight := COALESCE(NEW.package_weight, 0);
  IF weight <= 0 THEN
    RAISE EXCEPTION 'Package weight must be greater than zero';
  END IF;

  price := public.global_price_per_kilo();
  NEW.tracking_number := public.generate_order_tracking_number();
  NEW.actual_weight := NULL;
  NEW.payment_method := NULL;
  NEW.payment_status := 'unpaid';
  NEW.amount_paid := 0;
  NEW.promised_payment_date := NULL;
  NEW.payment_reference := NULL;
  NEW.pickup_photos := '[]'::jsonb;
  NEW.delivery_photos := '[]'::jsonb;

  IF NEW.trip_id IS NOT NULL THEN
    SELECT * INTO trip_row FROM public.trips WHERE id = NEW.trip_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected trip does not exist';
    END IF;

    next_weight := public.current_trip_weight(NEW.trip_id) + weight;
    -- Capacity check removed to allow administrators to manually exceed limits.

    price := COALESCE(NULLIF(trip_row.price_per_kg, 0), price);
    NEW.status := 'Assigned';
    NEW.origin := trip_row.origin;
    NEW.destination := trip_row.destination;
  ELSE
    NEW.status := 'Pending';
  END IF;

  NEW.shipping_cost := ROUND(weight * price, 2);
  NEW.remaining_balance := NEW.shipping_cost;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_row public.trips%ROWTYPE;
  weight NUMERIC;
  price NUMERIC;
  next_weight NUMERIC;
BEGIN
  IF NEW.trip_id IS NOT NULL AND NEW.status <> 'Cancelled' THEN
    SELECT * INTO trip_row FROM public.trips WHERE id = NEW.trip_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected trip does not exist';
    END IF;

    NEW.origin := trip_row.origin;
    NEW.destination := trip_row.destination;
    weight := COALESCE(NEW.actual_weight, NEW.package_weight, 0);
    next_weight := public.current_trip_weight(NEW.trip_id, NEW.id) + weight;
    -- Capacity check removed to allow administrators to manually exceed limits.

    IF OLD.trip_id IS DISTINCT FROM NEW.trip_id AND NEW.status = 'Pending' THEN
      NEW.status := 'Assigned';
    END IF;
  END IF;

  IF NEW.actual_weight IS DISTINCT FROM OLD.actual_weight
     OR NEW.trip_id IS DISTINCT FROM OLD.trip_id
     OR NEW.amount_paid IS DISTINCT FROM OLD.amount_paid THEN
    weight := COALESCE(NEW.actual_weight, NEW.package_weight, 0);
    price := CASE
      WHEN NEW.trip_id IS NOT NULL THEN public.effective_trip_price(NEW.trip_id)
      ELSE public.global_price_per_kilo()
    END;
    NEW.shipping_cost := ROUND(weight * price, 2);
    NEW.remaining_balance := GREATEST(0, NEW.shipping_cost - COALESCE(NEW.amount_paid, 0));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_prepare_insert ON orders;
CREATE TRIGGER orders_prepare_insert
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION public.prepare_order_insert();

DROP TRIGGER IF EXISTS orders_guard_update ON orders;
CREATE TRIGGER orders_guard_update
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_update();

CREATE OR REPLACE FUNCTION public.cancel_own_pending_order(p_order_id UUID)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_order public.orders;
BEGIN
  UPDATE public.orders
  SET status = 'Cancelled'
  WHERE id = p_order_id
    AND user_id = auth.uid()
    AND status = 'Pending'
  RETURNING * INTO updated_order;

  IF updated_order.id IS NULL THEN
    RAISE EXCEPTION 'Only your own pending orders can be cancelled';
  END IF;

  RETURN updated_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_own_pending_order(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.track_order_public(p_tracking_number TEXT)
RETURNS TABLE (
  tracking_number VARCHAR,
  status VARCHAR,
  sender_name VARCHAR,
  receiver_name VARCHAR,
  origin VARCHAR,
  destination VARCHAR,
  package_description TEXT,
  package_weight NUMERIC,
  actual_weight NUMERIC,
  shipping_cost NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.tracking_number,
    o.status,
    o.sender_name,
    o.receiver_name,
    o.origin,
    o.destination,
    o.package_description,
    o.package_weight,
    o.actual_weight,
    o.shipping_cost,
    o.created_at,
    o.updated_at
  FROM public.orders o
  WHERE o.tracking_number = UPPER(TRIM(p_tracking_number))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.track_order_public(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_business_profile()
RETURNS TABLE (
  name VARCHAR,
  smart_phone TEXT,
  globe_phone TEXT,
  facebook_link TEXT,
  manila_address TEXT,
  bohol_address TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.name,
    p.smart_phone,
    p.globe_phone,
    p.facebook_link,
    p.manila_address,
    p.bohol_address
  FROM public.profiles p
  WHERE p.role = 'admin'
  ORDER BY p.created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_business_profile() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_sales_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  WITH active_orders AS (
    SELECT *
    FROM public.orders
    WHERE status <> 'Cancelled'
  ),
  summary AS (
    SELECT jsonb_build_object(
      'totalRevenue', COALESCE(SUM(shipping_cost), 0),
      'cashTotal', COALESCE(SUM(amount_paid) FILTER (WHERE payment_method = 'cash'), 0),
      'gcashTotal', COALESCE(SUM(amount_paid) FILTER (WHERE payment_method = 'gcash'), 0),
      'paylaterTotal', COALESCE(SUM(amount_paid) FILTER (WHERE payment_method = 'paylater'), 0),
      'paidTotal', COALESCE(SUM(amount_paid), 0),
      'unpaidTotal', COALESCE(SUM(remaining_balance), 0),
      'unpaidCount', COUNT(*) FILTER (WHERE payment_status IS NULL OR payment_status IN ('unpaid', 'partial'))
    ) AS value
    FROM active_orders
  ),
  monthly AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.month DESC), '[]'::jsonb) AS value
    FROM (
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
        COALESCE(SUM(shipping_cost), 0) AS total_revenue,
        COALESCE(SUM(amount_paid), 0) AS collected,
        COALESCE(SUM(remaining_balance), 0) AS outstanding
      FROM active_orders
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC
      LIMIT 24
    ) m
  ),
  unpaid AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(u) ORDER BY u.created_at DESC), '[]'::jsonb) AS value
    FROM (
      SELECT id, tracking_number, created_at, shipping_cost, amount_paid, remaining_balance, payment_status
      FROM active_orders
      WHERE payment_status IS NULL OR payment_status IN ('unpaid', 'partial')
      ORDER BY created_at DESC
      LIMIT 100
    ) u
  )
  SELECT jsonb_build_object(
    'summary', summary.value,
    'monthlySales', monthly.value,
    'unpaidOrders', unpaid.value
  )
  INTO payload
  FROM summary, monthly, unpaid;

  RETURN payload;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_summary() TO authenticated;

-- Replace permissive profile policies.
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view profiles" ON profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Replace order policies with stricter insert rules. Admin update/delete remains server-side.
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;

CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND status IN ('Pending', 'Assigned')
    AND actual_weight IS NULL
    AND payment_method IS NULL
    AND payment_status = 'unpaid'
    AND amount_paid = 0
    AND pickup_photos = '[]'::jsonb
    AND delivery_photos = '[]'::jsonb
  );

CREATE POLICY "Admins can update orders" ON orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete orders" ON orders
  FOR DELETE USING (public.is_admin());

-- Replace permissive notification insert policy.
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can insert notifications" ON notifications
  FOR INSERT WITH CHECK (public.is_admin());

-- Supabase Storage bucket for proof photos. Private bucket; app reads signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cargo-photos',
  'cargo-photos',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admins manage cargo photos" ON storage.objects;
DROP POLICY IF EXISTS "Users read own cargo photos" ON storage.objects;

CREATE POLICY "Admins manage cargo photos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'cargo-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'cargo-photos' AND public.is_admin());

CREATE POLICY "Users read own cargo photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cargo-photos'
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = public.safe_uuid((storage.foldername(name))[2])
        AND o.user_id = auth.uid()
    )
  );
