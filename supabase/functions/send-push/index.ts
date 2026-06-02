// Supabase Edge Function: send-push
// Sends a push notification via Firebase Cloud Messaging (HTTP v1 API)
// Called when a notification is created in the database
//
// Environment secrets needed:
//   FIREBASE_SERVICE_ACCOUNT_B64 - base64 encoded Firebase service account JSON
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Google OAuth2 token generation for FCM v1
async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  // Encode header and payload
  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const unsignedToken = `${encode(header)}.${encode(payload)}`

  // Sign with RSA private key
  const keyData = serviceAccount.private_key
  const pemContents = keyData.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '')
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  )

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsignedToken))
  const signedToken = `${unsignedToken}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedToken}`,
  })

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const { user_id, title, body, url } = await req.json()

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'user_id and title required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Service-role client is used only after the requester has been authenticated.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
    )

    const { data: requester, error: requesterError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (requesterError || (requester?.role !== 'admin' && userData.user.id !== user_id)) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', user_id)
      .single()

    if (profileError || !profile?.fcm_token) {
      return new Response(JSON.stringify({ error: 'No FCM token for user', skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Get Firebase service account (stored as base64 to avoid env parsing issues)
    const serviceAccountB64 = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_B64')
    if (!serviceAccountB64) {
      return new Response(JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT_B64 not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const serviceAccount = JSON.parse(atob(serviceAccountB64))
    const projectId = serviceAccount.project_id
    const accessToken = await getAccessToken(serviceAccount)

    // Send push via FCM v1 API
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: profile.fcm_token,
            notification: {
              title: title,
              body: body || 'You have a new update',
            },
            webpush: {
              fcm_options: {
                link: url || '/customer/notifications',
              },
            },
          },
        }),
      }
    )

    const fcmResult = await fcmResponse.json()

    // Detect stale/invalid tokens and clean them up
    const fcmError = fcmResult?.error
    if (fcmError) {
      const errorCode = fcmError.details?.[0]?.errorCode || ''
      const isStaleToken =
        errorCode === 'UNREGISTERED' ||
        fcmError.status === 'NOT_FOUND' ||
        errorCode === 'INVALID_ARGUMENT'

      if (isStaleToken) {
        // Clear the dead token so we stop sending to it.
        // Next customer login will register a fresh one automatically.
        await supabase
          .from('profiles')
          .update({ fcm_token: null })
          .eq('id', user_id)

        return new Response(JSON.stringify({
          success: false,
          staleToken: true,
          error: fcmError.message || 'Device token is no longer valid',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      // Other FCM errors (quota, server error, etc.)
      return new Response(JSON.stringify({
        success: false,
        error: fcmError.message || 'FCM delivery failed',
        fcm: fcmResult,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return new Response(JSON.stringify({ success: true, fcm: fcmResult }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
