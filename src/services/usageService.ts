import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// Get or create session ID for anonymous users
function getSessionId(): string {
  let sessionId = localStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = uuidv4()
    localStorage.setItem('session_id', sessionId)
    // Also store in sessionStorage as backup
    sessionStorage.setItem('session_backup', sessionId)
  }
  return sessionId
}

export interface UsageStats {
  generationsUsed: number
  generationsRemaining: number
  canGenerate: boolean
  resetTime?: Date
}

export class UsageService {
  private sessionId: string

  constructor() {
    this.sessionId = getSessionId()
  }

  // Check if user can generate (server-side rate limiting)
  async checkUsageLimit(userId?: string): Promise<UsageStats> {
    const isAnonymous = !userId
    const maxGenerations = 5 // Both anonymous and authenticated users get 5 generations

    if (isAnonymous) {
      // For anonymous users, check local storage
      const today = new Date().toDateString()
      const stored = localStorage.getItem('anonymous_usage')
      let usage = { date: today, count: 0 }
      
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.date === today) {
          usage = parsed
        }
      }

      return {
        generationsUsed: usage.count,
        generationsRemaining: Math.max(0, maxGenerations - usage.count),
        canGenerate: usage.count < maxGenerations,
        resetTime: new Date(new Date().setHours(24, 0, 0, 0))
      }
    } else {
      // For authenticated users, check database
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .gte('last_generation', today)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      const generationsUsed = data?.generations_used || 0
      
      return {
        generationsUsed,
        generationsRemaining: Math.max(0, maxGenerations - generationsUsed),
        canGenerate: generationsUsed < maxGenerations,
        resetTime: new Date(new Date().setHours(24, 0, 0, 0))
      }
    }
  }

  // Record a generation attempt
  async recordGeneration(success: boolean, userId?: string, errorMessage?: string): Promise<void> {
    const isAnonymous = !userId

    // Log the generation attempt
    await supabase
      .from('generation_logs')
      .insert({
        user_id: userId || null,
        session_id: this.sessionId,
        success,
        error_message: errorMessage || null
      })

    if (success) {
      if (isAnonymous) {
        // Update local storage for anonymous users
        const today = new Date().toDateString()
        const stored = localStorage.getItem('anonymous_usage')
        let usage = { date: today, count: 0 }
        
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.date === today) {
            usage = parsed
          }
        }

        usage.count += 1
        localStorage.setItem('anonymous_usage', JSON.stringify(usage))
      } else {
        // Update database for authenticated users
        const today = new Date().toISOString().split('T')[0]
        
        const { data: existing } = await supabase
          .from('user_usage')
          .select('*')
          .eq('user_id', userId)
          .gte('last_generation', today)
          .single()

        if (existing) {
          await supabase
            .from('user_usage')
            .update({
              generations_used: existing.generations_used + 1,
              last_generation: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('user_usage')
            .insert({
              user_id: userId,
              generations_used: 1,
              last_generation: new Date().toISOString()
            })
        }
      }
    }
  }

  // Get usage analytics (for admin/monitoring)
  async getUsageAnalytics(days: number = 7) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('generation_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      totalGenerations: data.length,
      successfulGenerations: data.filter(log => log.success).length,
      failedGenerations: data.filter(log => !log.success).length,
      uniqueUsers: new Set(data.map(log => log.user_id || log.session_id)).size,
      anonymousUsers: data.filter(log => !log.user_id).length,
      authenticatedUsers: data.filter(log => log.user_id).length
    }
  }
}

export const usageService = new UsageService()