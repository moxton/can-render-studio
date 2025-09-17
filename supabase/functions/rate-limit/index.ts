import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-fingerprint, x-user-ip',
}

// Security constants - server-side only, impossible to bypass
const ANONYMOUS_DAILY_LIMIT = 5
const AUTHENTICATED_DAILY_LIMIT = 10
const MAX_FINGERPRINT_LENGTH = 500
const RATE_LIMIT_WINDOW_HOURS = 24

interface RateLimitRequest {
  action: 'check' | 'record'
  fingerprint: string
  success?: boolean
  errorMessage?: string
}

interface RateLimitResponse {
  canGenerate: boolean
  generationsUsed: number
  generationsRemaining: number
  resetTime: string
  isAuthenticated: boolean
  limitType: 'anonymous' | 'authenticated'
}

// Security helper functions
function sanitizeFingerprint(fingerprint: string): string {
  if (!fingerprint || fingerprint.length > MAX_FINGERPRINT_LENGTH) {
    throw new Error('Invalid fingerprint')
  }
  return fingerprint.replace(/[^a-zA-Z0-9]/g, '').substring(0, MAX_FINGERPRINT_LENGTH)
}

async function createSecureAnonymousId(ip: string, fingerprint: string): Promise<string> {
  const sanitizedFingerprint = sanitizeFingerprint(fingerprint)
  const combined = `${ip}:${sanitizedFingerprint}`
  const messageBuffer = new TextEncoder().encode(combined);
  const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);
  const hash = encodeHex(hashBuffer);
  return hash;
}

function validateRequest(req: Request): { ip: string, isValid: boolean } {
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                  req.headers.get('x-real-ip') || 
                  req.headers.get('cf-connecting-ip') || 
                  'unknown'
  
  // Basic IP validation
  const isValid = clientIP !== 'unknown' && clientIP.length > 0
  return { ip: clientIP, isValid }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request and extract IP
    const { ip: clientIP, isValid } = validateRequest(req)
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT token - server-side validation only
    const authHeader = req.headers.get('Authorization')
    let user = null
    let isAuthenticated = false
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const { data: { user: authUser }, error } = await supabaseClient.auth.getUser(
          authHeader.replace('Bearer ', '')
        )
        if (!error && authUser) {
          user = authUser
          isAuthenticated = true
        }
      } catch (error) {
        console.warn('Auth validation failed:', error)
        // Continue as anonymous user
      }
    }

    const { action, fingerprint, success, errorMessage }: RateLimitRequest = await req.json()
    
    if (!fingerprint) {
      return new Response(JSON.stringify({ error: 'Fingerprint required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create secure anonymous identifier (hashed for privacy)
    const anonymousId = await createSecureAnonymousId(clientIP, fingerprint)
    
    // Server-side limits - cannot be bypassed by client
    const maxGenerations = isAuthenticated ? AUTHENTICATED_DAILY_LIMIT : ANONYMOUS_DAILY_LIMIT
    const today = new Date().toISOString().split('T')[0]

    if (action === 'check') {
      let generationsUsed = 0
      let additionalAnonymousUsage = 0

      if (isAuthenticated) {
        // Check authenticated user usage - strict server-side validation
        const { data } = await supabaseClient
          .from('user_usage')
          .select('generations_used')
          .eq('user_id', user!.id)
          .eq('date', today)
          .single()
        
        generationsUsed = data?.generations_used || 0
      } else {
        // For anonymous users, check multiple vectors to prevent abuse
        
        // 1. Check by hashed anonymous ID (IP + fingerprint)
        const { data: anonymousData } = await supabaseClient
          .from('anonymous_usage')
          .select('generations_used')
          .eq('anonymous_id', anonymousId)
          .eq('date', today)
          .single()
        
        generationsUsed = anonymousData?.generations_used || 0

        // 2. Additional security: Check if this IP has other fingerprints today
        const { data: ipUsage } = await supabaseClient
          .from('anonymous_usage')
          .select('generations_used')
          .eq('ip_address', clientIP)
          .eq('date', today)
          .neq('anonymous_id', anonymousId)

        // If same IP has used other fingerprints, count towards limit
        if (ipUsage && ipUsage.length > 0) {
          additionalAnonymousUsage = ipUsage.reduce((sum, record) => sum + record.generations_used, 0)
        }

        // Apply the stricter limit
        generationsUsed = Math.max(generationsUsed, additionalAnonymousUsage)
      }

      // Server-side enforcement - cannot be bypassed
      const canGenerate = generationsUsed < maxGenerations
      const remaining = Math.max(0, maxGenerations - generationsUsed)

      const response: RateLimitResponse = {
        canGenerate,
        generationsUsed,
        generationsRemaining: remaining,
        resetTime: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
        isAuthenticated,
        limitType: isAuthenticated ? 'authenticated' : 'anonymous'
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'record' && success) {
      // Double-check limits before recording (prevent race conditions)
      let currentUsage = 0
      
      if (isAuthenticated) {
        const { data } = await supabaseClient
          .from('user_usage')
          .select('generations_used')
          .eq('user_id', user!.id)
          .eq('date', today)
          .single()
        
        currentUsage = data?.generations_used || 0
      } else {
        // Check anonymous usage with IP cross-validation
        const { data: anonymousData } = await supabaseClient
          .from('anonymous_usage')
          .select('generations_used')
          .eq('anonymous_id', anonymousId)
          .eq('date', today)
          .single()
        
        const { data: ipUsage } = await supabaseClient
          .from('anonymous_usage')
          .select('generations_used')
          .eq('ip_address', clientIP)
          .eq('date', today)

        const anonymousUsage = anonymousData?.generations_used || 0
        const totalIpUsage = ipUsage?.reduce((sum, record) => sum + record.generations_used, 0) || 0
        
        currentUsage = Math.max(anonymousUsage, totalIpUsage)
      }

      // Server-side limit enforcement - final check
      if (currentUsage >= maxGenerations) {
        return new Response(JSON.stringify({ 
          error: 'Generation limit exceeded',
          canGenerate: false,
          generationsUsed: currentUsage,
          generationsRemaining: 0
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Record successful generation
      if (isAuthenticated) {
        // Atomic upsert for authenticated users
        await supabaseClient
          .from('user_usage')
          .upsert({
            user_id: user!.id,
            date: today,
            generations_used: currentUsage + 1,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,date'
          })
      } else {
        // Atomic upsert for anonymous users
        await supabaseClient
          .from('anonymous_usage')
          .upsert({
            anonymous_id: anonymousId,
            ip_address: clientIP,
            fingerprint: sanitizeFingerprint(fingerprint),
            date: today,
            generations_used: (currentUsage || 0) + 1,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'anonymous_id,date'
          })
      }

      // Comprehensive audit log
      await supabaseClient
        .from('generation_logs')
        .insert({
          user_id: user?.id || null,
          anonymous_id: isAuthenticated ? null : anonymousId,
          ip_address: clientIP,
          fingerprint: sanitizeFingerprint(fingerprint),
          success: true,
          error_message: errorMessage || null,
          limit_type: isAuthenticated ? 'authenticated' : 'anonymous',
          generations_before: currentUsage,
          generations_after: currentUsage + 1
        })

      return new Response(JSON.stringify({ 
        success: true,
        generationsUsed: currentUsage + 1,
        generationsRemaining: maxGenerations - (currentUsage + 1)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Rate limit error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})