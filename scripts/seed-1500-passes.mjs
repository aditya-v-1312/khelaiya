import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://urniearrjtyouixezafg.supabase.co';
const supabaseKey = 'sb_publishable_MOC9diHpP1eIx_tH63CbUw_O122DkcT';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed1500Passes() {
  console.log('Seeding 1,500 numbered passes to Supabase...');
  const count = 1500;
  const passes = [];
  const now = new Date().toISOString();

  for (let i = 1; i <= count; i++) {
    const pad = String(i).padStart(4, '0');
    passes.push({
      ticket_id: `NUV-KHL-${pad}`,
      name: `Pass #${pad}`,
      enrollment: `PASS-${pad}`,
      phone: '',
      status: 'registered',
      created_at: now,
      entry_time: null,
      entry_gate: null,
      entry_scanner: null,
    });
  }

  // Batch insert in chunks of 250
  const chunkSize = 250;
  for (let i = 0; i < passes.length; i += chunkSize) {
    const chunk = passes.slice(i, i + chunkSize);
    const { error } = await supabase.from('attendees').upsert(chunk, { onConflict: 'ticket_id' });
    if (error) {
      console.error(`Error inserting chunk ${i} - ${i + chunkSize}:`, error);
      process.exit(1);
    }
    console.log(`Inserted passes ${i + 1} to ${Math.min(i + chunkSize, count)}...`);
  }

  const { count: finalCount } = await supabase.from('attendees').select('*', { count: 'exact', head: true });
  console.log(`✅ Successfully seeded! Total passes in Supabase: ${finalCount}`);
}

seed1500Passes().catch(console.error);
