import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://urniearrjtyouixezafg.supabase.co';
const supabaseKey = 'sb_publishable_MOC9diHpP1eIx_tH63CbUw_O122DkcT';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Connecting to Supabase to clear database...');

  // 1. Check existing count
  const { count: attCount, error: attErr } = await supabase.from('attendees').select('*', { count: 'exact', head: true });
  console.log('Current attendees in Supabase:', attCount, 'Error:', attErr?.message || 'none');

  const { count: logCount, error: logErr } = await supabase.from('scan_logs').select('*', { count: 'exact', head: true });
  console.log('Current scan logs in Supabase:', logCount, 'Error:', logErr?.message || 'none');

  // 2. Delete all scan_logs
  console.log('Deleting scan_logs...');
  const { error: delLogsErr } = await supabase.from('scan_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delLogsErr) console.warn('scan_logs delete warning:', delLogsErr.message);

  // 3. Delete all attendees
  console.log('Deleting attendees...');
  const { error: delAttErr } = await supabase.from('attendees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delAttErr) console.warn('attendees delete warning:', delAttErr.message);

  // 4. Verify count
  const { count: afterAtt } = await supabase.from('attendees').select('*', { count: 'exact', head: true });
  const { count: afterLogs } = await supabase.from('scan_logs').select('*', { count: 'exact', head: true });

  console.log('✅ After clearing -> Attendees in Supabase:', afterAtt, '| Scan logs in Supabase:', afterLogs);
}

main().catch(console.error);
