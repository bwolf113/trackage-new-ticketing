import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bflmjuzmmuhytkxpdrbw.supabase.co'
const supabaseKey = 'sb_publishable_6qXAbrMKjYCFHvKGDz6MEQ_cjLhu3ov'

export const supabase = createClient(supabaseUrl, supabaseKey)