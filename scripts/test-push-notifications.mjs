#!/usr/bin/env node
// ============================================================================
// Push Notification End-to-End Test Script
// Tests every layer of the notification pipeline:
//   1. Supabase Auth (login as admin)
//   2. Profiles table — FCM token presence
//   3. Supabase Edge Function (send-push) invocation
//   4. In-app notification creation
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://duigaivxgxlnjmfienhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1aWdhaXZ4Z3hsbmptZmllbmhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzg3NDAsImV4cCI6MjA5MjcxNDc0MH0.ElTqNXkEec9i-SeNPR_9dL7be76ExF2BKpVzkSCKG2Q';

const ADMIN_EMAIL = 'ship2doorofficial@gmail.com';
const ADMIN_PASS = '123456';

const CUSTOMER_EMAIL = 'joventibuc123@gmail.com';
const CUSTOMER_PASS = '12345678';

// ── Helpers ──────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️';
const INFO = 'ℹ️';

function hr() { console.log('─'.repeat(70)); }

// ── Test Results Collector ──────────────────────────────────────────────────
const results = [];
function record(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`  ${passed ? PASS : FAIL} ${name}${detail ? ` — ${detail}` : ''}`);
}

// ============================================================================
// TEST 1: Admin Login
// ============================================================================
async function testAdminLogin() {
  console.log('\n📋 TEST 1: Admin Authentication');
  hr();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });
  
  if (error) {
    record('Admin login', false, error.message);
    return null;
  }
  
  record('Admin login', true, `User ID: ${data.user.id}`);
  
  // Check admin role
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role, name, fcm_token')
    .eq('id', data.user.id)
    .single();
  
  if (profileErr) {
    record('Admin profile fetch', false, profileErr.message);
  } else {
    record('Admin profile fetch', true, `Name: ${profile.name}, Role: ${profile.role}`);
    record('Admin role is "admin"', profile.role === 'admin', `Actual: ${profile.role}`);
  }
  
  return { session: data.session, user: data.user, profile };
}

// ============================================================================
// TEST 2: Customer Profile & FCM Token
// ============================================================================
async function testCustomerFCMToken() {
  console.log('\n📋 TEST 2: Customer Profile & FCM Token');
  hr();
  
  // Sign in as customer to get their user ID
  const { data: custAuth, error: custAuthErr } = await supabase.auth.signInWithPassword({
    email: CUSTOMER_EMAIL,
    password: CUSTOMER_PASS,
  });
  
  if (custAuthErr) {
    record('Customer login', false, custAuthErr.message);
    return null;
  }
  
  record('Customer login', true, `User ID: ${custAuth.user.id}`);
  
  const { data: custProfile, error: custProfileErr } = await supabase
    .from('profiles')
    .select('id, name, role, fcm_token')
    .eq('id', custAuth.user.id)
    .single();
  
  if (custProfileErr) {
    record('Customer profile fetch', false, custProfileErr.message);
    return null;
  }
  
  record('Customer profile fetch', true, `Name: ${custProfile.name}`);
  
  const hasFCMToken = !!custProfile.fcm_token;
  record(
    'Customer has FCM token saved',
    hasFCMToken,
    hasFCMToken
      ? `Token: ${custProfile.fcm_token.substring(0, 30)}...`
      : 'No FCM token in profile. The customer needs to open the app in a browser, allow notifications, and the token will be registered automatically.'
  );
  
  // Sign out customer, we'll sign back in as admin for the push test
  await supabase.auth.signOut();
  
  return custProfile;
}

// ============================================================================
// TEST 3: In-App Notification Creation (insert into notifications table)
// ============================================================================
async function testInAppNotification(adminSession, customerId) {
  console.log('\n📋 TEST 3: In-App Notification (Database Insert)');
  hr();
  
  // Re-login as admin
  const { data: adminAuth, error: adminAuthErr } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });
  
  if (adminAuthErr) {
    record('Re-login as admin', false, adminAuthErr.message);
    return false;
  }
  
  record('Re-login as admin', true);
  
  // Insert a test notification
  const testNotif = {
    user_id: customerId,
    title: '🔔 Push Test Notification',
    message: `This is a test notification sent at ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`,
    type: 'general',
  };
  
  const { data: notifData, error: notifErr } = await supabase
    .from('notifications')
    .insert(testNotif)
    .select()
    .single();
  
  if (notifErr) {
    record('Insert notification to DB', false, notifErr.message);
    return false;
  }
  
  record('Insert notification to DB', true, `Notification ID: ${notifData.id}`);
  
  // Verify it's readable
  const { data: readBack, error: readErr } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notifData.id)
    .single();
  
  if (readErr) {
    record('Read back notification', false, readErr.message);
  } else {
    record('Read back notification', true, `Title: "${readBack.title}", Read: ${readBack.is_read}`);
  }
  
  return true;
}

// ============================================================================
// TEST 4: Edge Function (send-push) Invocation
// ============================================================================
async function testEdgeFunction(customerId) {
  console.log('\n📋 TEST 4: Edge Function "send-push" Invocation');
  hr();
  
  // Ensure we're logged in as admin
  const { data: adminAuth, error: adminAuthErr } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });
  
  if (adminAuthErr) {
    record('Admin auth for edge function', false, adminAuthErr.message);
    return;
  }
  
  record('Admin auth for edge function', true);
  
  const payload = {
    user_id: customerId,
    title: '📦 CargoExpress Push Test',
    body: `Test push at ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`,
    url: '/customer/notifications',
  };
  
  console.log(`  ${INFO} Calling send-push edge function...`);
  console.log(`  ${INFO} Payload: ${JSON.stringify(payload, null, 2)}`);
  
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('send-push', {
      body: payload,
    });
    
    if (edgeErr) {
      record('Edge function call', false, `Error: ${edgeErr.message || JSON.stringify(edgeErr)}`);
      
      // Check if it's a "function not found" error
      if (edgeErr.message?.includes('not found') || edgeErr.message?.includes('404')) {
        console.log(`\n  ${WARN} The "send-push" edge function may not be deployed yet.`);
        console.log(`  ${INFO} To deploy, run:`);
        console.log(`        supabase functions deploy send-push`);
        console.log(`  ${INFO} And set the secret:`);
        console.log(`        supabase secrets set FIREBASE_SERVICE_ACCOUNT_B64=<base64-encoded-service-account-json>`);
      }
      return;
    }
    
    console.log(`  ${INFO} Edge function response:`, JSON.stringify(edgeData, null, 2));
    
    if (edgeData?.success) {
      record('Edge function call', true, 'FCM push sent successfully!');
      
      if (edgeData.fcm?.name) {
        record('FCM message delivered', true, `Message name: ${edgeData.fcm.name}`);
      }
    } else if (edgeData?.skipped) {
      record('Edge function call', true, 'Function executed but skipped — no FCM token for user');
      console.log(`  ${WARN} The customer hasn't registered an FCM token yet.`);
      console.log(`  ${INFO} They need to: open the app in Chrome → allow notification permission.`);
    } else if (edgeData?.error) {
      record('Edge function call', false, `Function error: ${edgeData.error}`);
      
      if (edgeData.error.includes('FIREBASE_SERVICE_ACCOUNT_B64')) {
        console.log(`\n  ${WARN} The FIREBASE_SERVICE_ACCOUNT_B64 secret is not set.`);
        console.log(`  ${INFO} Steps to fix:`);
        console.log(`        1. Go to Firebase Console → Project Settings → Service Accounts`);
        console.log(`        2. Click "Generate New Private Key" → download JSON`);
        console.log(`        3. Base64-encode it: base64 -i service-account.json`);
        console.log(`        4. Set the secret: supabase secrets set FIREBASE_SERVICE_ACCOUNT_B64=<value>`);
      }
    } else {
      record('Edge function call', false, `Unexpected response: ${JSON.stringify(edgeData)}`);
    }
  } catch (err) {
    record('Edge function call', false, `Exception: ${err.message}`);
    
    // Check for common errors
    if (err.message?.includes('FunctionsHttpError') || err.message?.includes('404') || err.message?.includes('not found')) {
      console.log(`\n  ${WARN} The "send-push" edge function is likely not deployed.`);
      console.log(`  ${INFO} Deploy with: supabase functions deploy send-push`);
    }
  }
}

// ============================================================================
// TEST 5: Check Edge Function Deployment Status via Management API
// ============================================================================
async function testEdgeFunctionExists() {
  console.log('\n📋 TEST 5: Edge Function Deployment Check');
  hr();
  
  const projectRef = 'duigaivxgxlnjmfienhg';
  const url = `https://${projectRef}.supabase.co/functions/v1/send-push`;
  
  try {
    // An OPTIONS pre-flight request will tell us if the function exists
    const resp = await fetch(url, { method: 'OPTIONS' });
    
    if (resp.status === 200 || resp.status === 204) {
      record('Edge function reachable (OPTIONS)', true, `Status: ${resp.status}`);
    } else if (resp.status === 404) {
      record('Edge function reachable (OPTIONS)', false, 'Function not found (404) — needs deployment');
    } else {
      record('Edge function reachable (OPTIONS)', false, `Unexpected status: ${resp.status}`);
    }
  } catch (err) {
    record('Edge function reachable (OPTIONS)', false, `Network error: ${err.message}`);
  }
}

// ============================================================================
// TEST 6: Firebase Config Validation
// ============================================================================
async function testFirebaseConfig() {
  console.log('\n📋 TEST 6: Firebase Configuration Check');
  hr();
  
  const config = {
    VITE_FIREBASE_API_KEY: 'AIzaSyCyEkwwiJP6OBwwJOi1UIsVrRbC0rSYLLM',
    VITE_FIREBASE_AUTH_DOMAIN: 'ship2door-e8405.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'ship2door-e8405',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '284016614377',
    VITE_FIREBASE_APP_ID: '1:284016614377:web:bcd29bbd8a4d2479bbc978',
    VITE_FIREBASE_VAPID_KEY: 'BGHnoQ-EtIaI3IGSj2A1PP4MgBTW-CrhE5KK74Dn1nCX3Q3aH7LIWjZakKf6_Vhwg6ez-jBm9ElIny_buzE0XVs',
  };
  
  for (const [key, value] of Object.entries(config)) {
    const hasValue = !!value && value.length > 5;
    record(`${key} present`, hasValue, hasValue ? `${value.substring(0, 20)}...` : 'MISSING');
  }
  
  // Validate the VAPID key format (should be base64url, ~87 chars)
  const vapid = config.VITE_FIREBASE_VAPID_KEY;
  const vapidValid = vapid && vapid.length >= 80 && /^[A-Za-z0-9_-]+$/.test(vapid);
  record('VAPID key format valid', vapidValid, `Length: ${vapid?.length || 0}`);
}

// ============================================================================
// TEST 7: Check unread notification count for customer
// ============================================================================
async function testUnreadCount(customerId) {
  console.log('\n📋 TEST 7: Unread Notification Count');
  hr();
  
  // Login as customer
  const { data: custAuth, error: custAuthErr } = await supabase.auth.signInWithPassword({
    email: CUSTOMER_EMAIL,
    password: CUSTOMER_PASS,
  });
  
  if (custAuthErr) {
    record('Customer login for unread check', false, custAuthErr.message);
    return;
  }
  
  const { count, error: countErr } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', customerId)
    .eq('is_read', false);
  
  if (countErr) {
    record('Unread notification count', false, countErr.message);
  } else {
    record('Unread notification count', true, `${count} unread notifications`);
  }
  
  // Get recent notifications
  const { data: recent, error: recentErr } = await supabase
    .from('notifications')
    .select('id, title, message, type, is_read, created_at')
    .eq('user_id', customerId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (!recentErr && recent?.length > 0) {
    console.log(`\n  ${INFO} Recent notifications:`);
    for (const n of recent) {
      const readIcon = n.is_read ? '📖' : '🆕';
      console.log(`    ${readIcon} [${n.type}] "${n.title}" — ${n.created_at}`);
    }
  }
  
  await supabase.auth.signOut();
}

// ============================================================================
// MAIN — Run all tests
// ============================================================================
async function main() {
  console.log('');
  console.log('═'.repeat(70));
  console.log(' 🚀 CargoExpress PH — Push Notification Test Suite');
  console.log('═'.repeat(70));
  console.log(` ${INFO} Time: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
  
  // Test 6: Firebase config (no auth needed)
  await testFirebaseConfig();
  
  // Test 1: Admin auth
  const admin = await testAdminLogin();
  if (!admin) {
    console.log(`\n${FAIL} Cannot proceed without admin login. Aborting.`);
    process.exit(1);
  }
  
  await supabase.auth.signOut();
  
  // Test 2: Customer FCM token
  const custProfile = await testCustomerFCMToken();
  if (!custProfile) {
    console.log(`\n${FAIL} Cannot proceed without customer profile. Aborting.`);
    process.exit(1);
  }
  
  // Test 3: In-app notification
  await testInAppNotification(admin.session, custProfile.id);
  
  // Test 5: Edge function deployment check
  await testEdgeFunctionExists();
  
  // Test 4: Edge function invocation (sends actual push)
  await testEdgeFunction(custProfile.id);
  
  // Test 7: Unread count
  await testUnreadCount(custProfile.id);
  
  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n');
  console.log('═'.repeat(70));
  console.log(' 📊 TEST SUMMARY');
  console.log('═'.repeat(70));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  for (const r of results) {
    console.log(`  ${r.passed ? PASS : FAIL} ${r.name}`);
  }
  
  console.log('');
  hr();
  console.log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  hr();
  
  if (failed > 0) {
    console.log(`\n${WARN} Some tests failed. See details above for remediation steps.\n`);
  } else {
    console.log(`\n${PASS} All tests passed! Push notifications are working end-to-end.\n`);
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`\n${FAIL} Unexpected error:`, err);
  process.exit(1);
});
