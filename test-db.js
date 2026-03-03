require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

async function run() {
    console.log('Fetching...');
    const { data, error } = await supabaseAdmin
        .from('actual_output')
        .select(`id, hour_slot, output, target_output, created_at, data_items!inner(line_process!inner(line_id))`);

    console.log('Data count:', data?.length);
    if (error) console.error('Error:', error);
    process.exit();
}
run();
