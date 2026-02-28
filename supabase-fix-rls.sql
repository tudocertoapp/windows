-- Execute no SQL Editor do Supabase se os cadastros não estiverem funcionando:
-- https://supabase.com/dashboard/project/azvfiuvggppnulfepwbc/sql
-- Este script corrige as políticas RLS para permitir INSERT (cadastro)

DROP POLICY IF EXISTS "Users own transactions" ON transactions;
DROP POLICY IF EXISTS "Users own agenda_events" ON agenda_events;
DROP POLICY IF EXISTS "Users own check_list_items" ON check_list_items;
DROP POLICY IF EXISTS "Users own clients" ON clients;
DROP POLICY IF EXISTS "Users own products" ON products;
DROP POLICY IF EXISTS "Users own composite_products" ON composite_products;
DROP POLICY IF EXISTS "Users own services" ON services;
DROP POLICY IF EXISTS "Users own suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users own boletos" ON boletos;
DROP POLICY IF EXISTS "Users own a_receber" ON a_receber;
DROP POLICY IF EXISTS "Users own profiles" ON profiles;

CREATE POLICY "Users own transactions" ON transactions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own agenda_events" ON agenda_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own check_list_items" ON check_list_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own clients" ON clients FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own products" ON products FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own composite_products" ON composite_products FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own services" ON services FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own suppliers" ON suppliers FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own boletos" ON boletos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own a_receber" ON a_receber FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own profiles" ON profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
