import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, ANON_KEY)
