-- Fix: customers_update_cm lacked WITH CHECK, allowing a CM to move a
-- customer to a company they don't belong to during an UPDATE.

DROP POLICY IF EXISTS customers_update_cm ON customers;

CREATE POLICY customers_update_cm ON customers
  FOR UPDATE
  USING (
    public.user_role() = 'customer_manager'
    AND company_id IN (SELECT public.user_company_ids())
  )
  WITH CHECK (
    public.user_role() = 'customer_manager'
    AND company_id IN (SELECT public.user_company_ids())
  );
