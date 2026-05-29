// Supabase Edge Function: paymongo-create-payment
// Captures a chargeable PayMongo source using the server-side secret key.
//
// Required Supabase secrets:
//   PAYMONGO_SECRET_KEY
//   SUPABASE_URL
//   SUPABASE_ANON_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Authentication required' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return json({ error: 'Authentication required' }, 401)
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return json({ error: 'Admin access required' }, 403)
    }

    const { sourceId, amount, description } = await req.json()
    const parsedAmount = Number(amount)

    if (!sourceId || typeof sourceId !== 'string') {
      return json({ error: 'sourceId is required' }, 400)
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return json({ error: 'amount must be greater than zero' }, 400)
    }

    const paymongoSecretKey = Deno.env.get('PAYMONGO_SECRET_KEY')
    if (!paymongoSecretKey) {
      return json({ error: 'PAYMONGO_SECRET_KEY is not configured' }, 500)
    }

    const token = btoa(`${paymongoSecretKey}:`)
    const response = await fetch('https://api.paymongo.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${token}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(parsedAmount * 100),
            source: { id: sourceId, type: 'source' },
            currency: 'PHP',
            description: description || 'CargoExpress PH Shipping Payment',
          },
        },
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      return json(
        { error: result.errors?.[0]?.detail || 'Failed to process payment' },
        response.status,
      )
    }

    return json({
      paymentId: result.data.id,
      status: result.data.attributes.status,
      amount: result.data.attributes.amount / 100,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected payment error'
    return json({ error: message }, 500)
  }
})
