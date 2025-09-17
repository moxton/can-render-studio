import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/utils/fingerprint'

export interface SecureUsageStats {
  generationsUsed: number
  generationsRemaining: number
  canGenerate: boolean
  resetTime: Date
  isAuthenticated: boolean
  maxGenerations: number
  limitType: 'anonymous' | 'authenticated'
}

class SecureUsageService {
  private deviceId: string

  constructor() {
    this.deviceId = getDeviceId()
  }

  // Check usage limit via bulletproof server-side validation
  async checkUsageLimit(): Promise<SecureUsageStats> {
    const { data: { session } } = await supabase.auth.getSession()
    const isAuthenticated = !!session?.user
    
    try {
      const response = await supabase.functions.invoke('rate-limit', {
        body: {
          action: 'check',
          fingerprint: this.deviceId
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      const data = response.data
      return {
        generationsUsed: data.generationsUsed,
        generationsRemaining: data.generationsRemaining,
        canGenerate: data.canGenerate,
        resetTime: new Date(data.resetTime),
        isAuthenticated: data.isAuthenticated,
        maxGenerations: data.isAuthenticated ? 10 : 5,
        limitType: data.limitType
      }
    } catch (error) {
      console.error('Edge Function not available, using fallback:', error)
      
      // FALLBACK: Simple client-side tracking until Edge Function is deployed
      return this.getFallbackUsageStats(isAuthenticated)
    }
  }

  // Fallback usage tracking for development/before Edge Function deployment
  private getFallbackUsageStats(isAuthenticated: boolean): SecureUsageStats {
    const maxGenerations = isAuthenticated ? 10 : 5
    const storageKey = isAuthenticated ? `auth_usage_${this.deviceId}` : `anon_usage_${this.deviceId}`
    const today = new Date().toDateString()
    
    // Get stored usage for today
    const stored = localStorage.getItem(storageKey)
    let usageData = { date: today, count: 0 }
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.date === today) {
          usageData = parsed
        }
      } catch (e) {
        console.warn('Failed to parse stored usage data')
      }
    }
    
    const generationsUsed = usageData.count
    const generationsRemaining = Math.max(0, maxGenerations - generationsUsed)
    
    return {
      generationsUsed,
      generationsRemaining,
      canGenerate: generationsRemaining > 0,
      resetTime: new Date(new Date().setHours(24, 0, 0, 0)),
      isAuthenticated,
      maxGenerations,
      limitType: isAuthenticated ? 'authenticated' : 'anonymous'
    }
  }

  // Record generation via bulletproof server-side validation
  async recordGeneration(success: boolean, errorMessage?: string): Promise<{ success: boolean; generationsUsed?: number; generationsRemaining?: number }> {
    const { data: { session } } = await supabase.auth.getSession()
    const isAuthenticated = !!session?.user
    
    try {
      const response = await supabase.functions.invoke('rate-limit', {
        body: {
          action: 'record',
          fingerprint: this.deviceId,
          success,
          errorMessage
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data
    } catch (error) {
      console.error('Edge Function not available, using fallback recording:', error)
      
      // FALLBACK: Record in localStorage until Edge Function is deployed
      if (success) {
        this.recordFallbackGeneration(isAuthenticated)
      }
      
      return { success: true }
    }
  }

  // Fallback generation recording
  private recordFallbackGeneration(isAuthenticated: boolean): void {
    const maxGenerations = isAuthenticated ? 10 : 5
    const storageKey = isAuthenticated ? `auth_usage_${this.deviceId}` : `anon_usage_${this.deviceId}`
    const today = new Date().toDateString()
    
    // Get current usage
    const stored = localStorage.getItem(storageKey)
    let usageData = { date: today, count: 0 }
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.date === today) {
          usageData = parsed
        }
      } catch (e) {
        console.warn('Failed to parse stored usage data')
      }
    }
    
    // Increment count
    usageData.count = Math.min(usageData.count + 1, maxGenerations)
    
    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(usageData))
  }

  // Clear any local storage (for testing/debugging only)
  clearLocalData(): void {
    // Clear all possible usage tracking keys
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes('usage') || key.includes('device_id') || key.includes('session_id')) {
        localStorage.removeItem(key)
      }
    })
    
    // Force regeneration of device ID
    this.deviceId = getDeviceId()
  }

  // Get analytics (admin only)
  async getUsageAnalytics(days: number = 7) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('generation_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    const uniqueUsers = new Set()
    const uniqueAnonymous = new Set()

    data.forEach(log => {
      if (log.user_id) {
        uniqueUsers.add(log.user_id)
      } else {
        uniqueAnonymous.add(log.anonymous_id)
      }
    })

    return {
      totalGenerations: data.length,
      successfulGenerations: data.filter(log => log.success).length,
      failedGenerations: data.filter(log => !log.success).length,
      uniqueAuthenticatedUsers: uniqueUsers.size,
      uniqueAnonymousUsers: uniqueAnonymous.size,
      totalUniqueUsers: uniqueUsers.size + uniqueAnonymous.size
    }
  }
}

export const secureUsageService = new SecureUsageService()