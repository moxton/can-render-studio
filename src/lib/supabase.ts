import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      user_usage: {
        Row: {
          id: string
          user_id: string
          generations_used: number
          last_generation: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          generations_used?: number
          last_generation?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          generations_used?: number
          last_generation?: string
          created_at?: string
          updated_at?: string
        }
      }
      generation_logs: {
        Row: {
          id: string
          user_id: string | null
          session_id: string
          created_at: string
          success: boolean
          error_message: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id: string
          created_at?: string
          success?: boolean
          error_message?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string
          created_at?: string
          success?: boolean
          error_message?: string | null
        }
      }
    }
  }
}