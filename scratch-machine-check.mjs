import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: line } = await supabaseAdmin.from('line').select('id, name').ilike('name', '%Line A%').single();
  console.log("Line A:", line);

  if (line) {
    const { data: lp } = await supabaseAdmin.from('line_process').select('process_id, process_order').eq('line_id', line.id);
    console.log("Line A Processes:", lp);
    
    if (lp && lp.length > 0) {
      const processIds = lp.map(x => x.process_id);
      const { data: processes } = await supabaseAdmin.from('process').select('id, name, index, machine_id').in('id', processIds);
      console.log("Processes for Line A:", processes);
      
      // Let's link it!
      const printLabelProcess = processes.find(p => p.index === 1 || p.name.includes('print'));
      if (printLabelProcess) {
        console.log("Found target process to link:", printLabelProcess);
        const { error } = await supabaseAdmin.from('process').update({ machine_id: 'e8e5eb32-515c-484c-bbae-0675939208fc' }).eq('id', printLabelProcess.id);
        console.log("Update error:", error);
        if (!error) console.log("SUCCESSFULLY LINKED Machine-Line A-1 to Line A!");
      }
    }
  }
}

check();
