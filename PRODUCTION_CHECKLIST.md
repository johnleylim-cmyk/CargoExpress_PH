# CargoExpress PH Production Checklist

Run these steps before treating the app as production-ready.

## Supabase

1. Revoke any personal access token that was pasted outside the CLI.
2. Apply `supabase/schema.sql` to the project database.
3. Confirm these RPCs exist: `track_order_public`, `cancel_own_pending_order`, `get_public_business_profile`, `get_sales_summary`.
4. Confirm the private Storage bucket `cargo-photos` exists.
5. Deploy Edge Functions:
   - `send-push`
   - `paymongo-create-payment`
   - `store-photo-fallback`
   - `get-photo-fallback`
6. Set Edge Function secrets:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FIREBASE_SERVICE_ACCOUNT_B64`
   - `PAYMONGO_SECRET_KEY`
7. Verify RLS policies in the dashboard:
   - Profiles are not publicly selectable.
   - Customers can only read their own orders.
   - Public tracking works only through `track_order_public`.
   - Customers cancel pending orders only through `cancel_own_pending_order`.
   - Notifications cannot be inserted for arbitrary users by non-admins.

## Firebase

1. Keep Firestore locked to server-side service-account access.
2. Do not expose Firebase service-account JSON in the frontend.
3. Keep FCM client config in Vite env variables only.
4. Use Firestore fallback only for compressed proof photos under 700 KB.

## PayMongo

1. Set `VITE_PAYMONGO_PUBLIC_KEY` in frontend deployment env.
2. Set `PAYMONGO_SECRET_KEY` in Supabase Edge Function secrets.
3. Before live launch, add a PayMongo webhook flow that reconciles final payment state server-side.
4. Test failed, expired, cancelled, and successful GCash source states.

## App Checks

1. Run `npm run check`.
2. Test these flows with real customer/admin accounts:
   - Register/login/reset password.
   - Customer booking with and without selected trip.
   - Trip capacity rejection.
   - Customer pending-order cancellation.
   - Admin pickup with Supabase Storage upload.
   - Admin pickup with forced Storage failure and Firestore fallback.
   - Public tracking by tracking number.
   - Push notifications.
   - Sales and reports pages.
