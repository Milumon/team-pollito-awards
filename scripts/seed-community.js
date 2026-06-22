/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local for Supabase credentials
function getSupabaseCredentials() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local not found at', envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  });
  
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    process.exit(1);
  }

  return { supabaseUrl, serviceRoleKey };
}

async function runSeed() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseCredentials();
  
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const backupPath = path.join(__dirname, '../historical_interviews_backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error('Error: backup file not found at', backupPath);
    process.exit(1);
  }

  console.log('Loading historical_interviews_backup.json...');
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  const { pollitos = [], pollitos_regresar = [], members = [] } = backupData;
  console.log(`Loaded ${pollitos.length} candidates, ${pollitos_regresar.length} unbans, ${members.length} members.`);

  // Key format: "roblox_user_tiktok_user" (lowercased and trimmed)
  const uniqueUsers = new Map();

  function processRecord(roblox, tiktok, status, record) {
    const r = (roblox || '').trim();
    const t = (tiktok || '').trim();
    if (!r || !t) return;
    
    const key = `${r.toLowerCase()}_${t.toLowerCase()}`;
    
    let dbStatus = status;
    if (dbStatus === 'approved') dbStatus = 'official';
    if (!dbStatus) dbStatus = 'official'; // fallback for members
    
    // Status priority for deduplication
    // official > pending > rejected
    const priority = dbStatus === 'official' ? 3 : (dbStatus === 'pending' ? 2 : 1);

    const interview_date = record.interview_date || record.preferred_date || null;
    const interview_time = record.interview_time || null;
    const moderator = record.moderator || null;
    const created_at = record.created_at || new Date().toISOString();

    const mappedRecord = {
      roblox_user: r,
      tiktok_user: t,
      status: dbStatus,
      interview_date,
      interview_time,
      moderator,
      created_at,
    };

    const existing = uniqueUsers.get(key);
    if (!existing) {
      uniqueUsers.set(key, { mapped: mappedRecord, priority });
    } else {
      let replace = false;
      if (priority > existing.priority) {
        replace = true;
      } else if (priority === existing.priority) {
        // If priority is same, prefer the one with interview metadata
        const existingHasDetails = existing.mapped.interview_date || existing.mapped.moderator;
        const newHasDetails = mappedRecord.interview_date || mappedRecord.moderator;
        if (newHasDetails && !existingHasDetails) {
          replace = true;
        }
      }
      if (replace) {
        uniqueUsers.set(key, { mapped: mappedRecord, priority });
      }
    }
  }

  // 1. Process pollitos array
  pollitos.forEach(p => {
    processRecord(p.roblox_user, p.tiktok_user, p.status, p);
  });

  // 2. Process pollitos_regresar (returning/unban requests)
  pollitos_regresar.forEach(pr => {
    processRecord(pr.roblox_user, pr.tiktok_user, pr.status, pr);
  });

  // 3. Process members array
  members.forEach(m => {
    processRecord(m.roblox_user, m.tiktok_user, 'official', m);
  });

  const finalRecords = Array.from(uniqueUsers.values()).map(x => x.mapped);
  console.log(`Deduplication complete. Total unique records to seed: ${finalRecords.length}`);

  // Batch insert into interview_history
  const batchSize = 50;
  let insertedCount = 0;
  
  for (let i = 0; i < finalRecords.length; i += batchSize) {
    const chunk = finalRecords.slice(i, i + batchSize);
    console.log(`Upserting batch ${Math.floor(i / batchSize) + 1}...`);
    
    // We use upsert on (roblox_user, tiktok_user) to handle re-runs gracefully
    const { error } = await supabaseAdmin
      .from('interview_history')
      .upsert(chunk, { onConflict: 'roblox_user,tiktok_user' });

    if (error) {
      console.error(`Error inserting batch starting at index ${i}:`, error.message);
      process.exit(1);
    }
    insertedCount += chunk.length;
  }

  console.log(`Successfully seeded ${insertedCount} unique historical interview records!`);
}

runSeed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
