require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

async function run() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const { data: lpData } = await supabaseAdmin.from('line_process').select('*').limit(2);
    console.log('Sample line_process:', lpData[0]);
    if (!lpData[0]) return process.exit();

    const lineId = lpData[0].line_id;
    console.log('Testing with line_id:', lineId);

    const { data, error } = await supabaseAdmin
        .from('actual_output')
        .select('id, hour_slot, output, target_output, created_at, data_items!inner(line_process!inner(line_id))')
        .gte('created_at', d.toISOString())
        .lte('created_at', end.toISOString())
        .eq('data_items.line_process.line_id', lineId);

    console.log('Count:', data?.length);
    console.log('Error:', error);
    process.exit();
}
run();
