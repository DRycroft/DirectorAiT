// test-storage-isolation.js
// Two-organization storage isolation test
// Usage: SUPABASE_URL=<url> SUPABASE_ANON_KEY=<key> node tools/test-storage-isolation.js

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error('Required env vars: SUPABASE_URL and SUPABASE_ANON_KEY');
}

const clientFor = (email, pass) => {
  const s = createClient(url, anon, { auth: { persistSession: false } });
  return { s, email, pass };
};

async function run() {
  console.log('=== Storage Isolation Test ===\n');
  
  const userA = clientFor('usera@orga.com', 'TestPass123!');
  const userB = clientFor('userb@orgb.com', 'TestPass123!');

  // Sign in User A
  console.log('1. Signing in User A...');
  let r = await userA.s.auth.signInWithPassword({ 
    email: userA.email, 
    password: userA.pass 
  });
  if (r.error) throw new Error(`User A login failed: ${r.error.message}`);
  console.log('✓ User A authenticated');

  // Get User A's org_id
  let { data: profileA, error: profErr } = await userA.s
    .from('profiles')
    .select('org_id')
    .single();
  if (profErr) throw new Error(`Profile fetch failed: ${profErr.message}`);
  
  const orgA = profileA.org_id;
  console.log(`✓ User A org_id: ${orgA}\n`);

  // Upload test file as User A
  console.log('2. User A uploading test file...');
  const key = `${orgA}/isolation-test-${Date.now()}.txt`;
  const { error: upErr } = await userA.s.storage
    .from('board-documents')
    .upload(key, Buffer.from('isolation test'), { upsert: true });
  
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
  console.log(`✓ Upload successful: ${key}\n`);

  // Sign in User B
  console.log('3. Signing in User B (different org)...');
  r = await userB.s.auth.signInWithPassword({ 
    email: userB.email, 
    password: userB.pass 
  });
  if (r.error) throw new Error(`User B login failed: ${r.error.message}`);
  
  let { data: profileB } = await userB.s.from('profiles').select('org_id').single();
  console.log(`✓ User B authenticated (org_id: ${profileB.org_id})\n`);

  // Test 1: User B tries to list User A's folder
  console.log('4. ISOLATION TEST: User B listing User A\'s folder...');
  const { data: listData, error: listErr } = await userB.s.storage
    .from('board-documents')
    .list(orgA);
  
  console.log('List result:');
  console.log('  Data:', listData);
  console.log('  Error:', listErr);
  
  if (listErr || (listData && listData.length === 0)) {
    console.log('✅ PASS: User B cannot list User A\'s files\n');
  } else {
    console.log('❌ FAIL: User B can see User A\'s files!\n');
  }

  // Test 2: User B tries to download User A's file
  console.log('5. ISOLATION TEST: User B downloading User A\'s file...');
  const { data: dlData, error: dlErr } = await userB.s.storage
    .from('board-documents')
    .download(key);
  
  console.log('Download result:');
  console.log('  Success:', !!dlData);
  console.log('  Error:', dlErr);
  
  if (dlErr) {
    console.log('✅ PASS: User B cannot download User A\'s file\n');
  } else {
    console.log('❌ FAIL: User B can download User A\'s file!\n');
  }

  // Cleanup
  console.log('6. Cleaning up test file...');
  await userA.s.storage.from('board-documents').remove([key]);
  console.log('✓ Cleanup complete\n');

  console.log('=== Test Complete ===');
  
  // Exit with appropriate code
  const allPassed = (listErr || listData.length === 0) && dlErr;
  process.exit(allPassed ? 0 : 1);
}

run().catch(e => { 
  console.error('\n❌ Test failed with error:', e.message); 
  process.exit(2); 
});
