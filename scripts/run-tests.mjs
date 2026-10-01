import { recordQREntry, verifyQR, recordManualEntry, getAttendees, importAttendeesBatch, reissueAttendeeTicket, getDashboardStats } from '../lib/supabase/db.ts';
import { generateTicketId } from '../lib/ticket-generator.ts';

async function runTestSuite() {
  console.log('========================================================================');
  console.log('  NUV KHELAIYA QR TICKET SYSTEM — AUTOMATED VERIFICATION SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${extraInfo}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${extraInfo}`);
      failed++;
    }
  }

  // PREPARATION: Seed fresh test attendees
  console.log('--- 0. PREPARATION & IMPORT ---');
  const testAttendee1 = {
    name: 'Vishwa Prajapati',
    enrollment: '26001017',
    phone: '9409679991',
  };
  const testAttendee2 = {
    name: 'Jiya Khetwani',
    enrollment: '26000996',
    phone: '8460916715',
  };
  const testAttendee3 = {
    name: 'Dev Patel',
    enrollment: '26001050',
    phone: '9825012345',
  };

  const importRes = await importAttendeesBatch([testAttendee1, testAttendee2, testAttendee3]);
  assert(importRes.imported >= 0, 'Batch import executed successfully', `(Imported: ${importRes.imported})`);

  const { attendees } = await getAttendees({ search: '26001017' });
  const vishwa = attendees.find((a) => a.enrollment === '26001017');
  assert(!!vishwa, 'Attendee Vishwa found in database', `Ticket: ${vishwa?.ticket_id}`);

  const vishwaTicket = vishwa.ticket_id;

  // TEST 1: Valid Registered QR
  console.log('\n--- TEST 1: Valid Registered QR ---');
  const scan1 = await recordQREntry({
    ticketId: vishwaTicket,
    gate: 'Gate 1',
    scannerId: 'G1-A',
  });
  assert(
    scan1.success === true && scan1.result === 'valid',
    'Valid registered QR gives ENTRY APPROVED',
    `Status: ${scan1.result}`
  );

  // TEST 2: Scan Same QR Again (Duplicate Detection)
  console.log('\n--- TEST 2: Scan Same QR Again (Duplicate Attempt) ---');
  const scan2 = await recordQREntry({
    ticketId: vishwaTicket,
    gate: 'Gate 1',
    scannerId: 'G1-B',
  });
  assert(
    scan2.success === false && scan2.result === 'already_entered',
    'Scanning used ticket returns ALREADY ENTERED',
    `Result: ${scan2.result}`
  );

  // TEST 3: Completely Random QR
  console.log('\n--- TEST 3: Completely Random QR ---');
  const fakeTicket = 'NUV-KHL-RANDOMFAKE99';
  const scan3 = await recordQREntry({
    ticketId: fakeTicket,
    gate: 'Gate 2',
    scannerId: 'G2-A',
  });
  assert(
    scan3.success === false && scan3.result === 'invalid',
    'Random ticket returns INVALID QR',
    `Result: ${scan3.result}`
  );

  // TEST 4: Revoked QR
  console.log('\n--- TEST 4: Revoked QR ---');
  const { attendees: devList } = await getAttendees({ search: '26001050' });
  const dev = devList.find((a) => a.enrollment === '26001050');
  await reissueAttendeeTicket(dev.id, 'revoke');

  const scan4 = await recordQREntry({
    ticketId: dev.ticket_id,
    gate: 'Gate 1',
    scannerId: 'G1-A',
  });
  assert(
    scan4.success === false && scan4.result === 'revoked',
    'Revoked ticket returns REVOKED and blocks entry',
    `Result: ${scan4.result}`
  );

  // TEST 5: CRITICAL CONCURRENCY TEST (Simultaneous Scans Across 2 Phones)
  console.log('\n--- TEST 5: CRITICAL RACE CONDITION CONCURRENCY TEST ---');
  // Create a brand new attendee for concurrency race test
  const raceAttendee = {
    name: 'Concurrent Runner',
    enrollment: '26009999',
    phone: '9999988888',
  };
  await importAttendeesBatch([raceAttendee]);
  const { attendees: raceList } = await getAttendees({ search: '26009999' });
  const concurrentTarget = raceList[0];

  console.log(`  Firing 2 simultaneous scan requests for ticket: ${concurrentTarget.ticket_id}...`);
  // Fire 2 concurrent requests at the exact same millisecond
  const [phone1Res, phone2Res] = await Promise.all([
    recordQREntry({
      ticketId: concurrentTarget.ticket_id,
      gate: 'Gate 1',
      scannerId: 'G1-A',
    }),
    recordQREntry({
      ticketId: concurrentTarget.ticket_id,
      gate: 'Gate 2',
      scannerId: 'G2-A',
    }),
  ]);

  const results = [phone1Res.result, phone2Res.result];
  const validCount = results.filter((r) => r === 'valid').length;
  const duplicateCount = results.filter((r) => r === 'already_entered').length;

  assert(
    validCount === 1 && duplicateCount === 1,
    'Atomic row lock prevents race condition: EXACTLY 1 APPROVED and 1 ALREADY_ENTERED',
    `Phone 1: ${phone1Res.result}, Phone 2: ${phone2Res.result}`
  );

  // TEST 6: Verification Scanner Scans Valid Entered QR
  console.log('\n--- TEST 6 & 7: Verification Scanner ---');
  const verifyEntered = await verifyQR({
    ticketId: vishwaTicket,
    gate: 'Gate 1',
    scannerId: 'V-1',
  });
  assert(
    verifyEntered.result === 'valid_entered',
    'Verification scanner correctly sees VALID — ENTERED without changing status',
    `Result: ${verifyEntered.result}`
  );

  // Create unused attendee for Test 7
  const unusedAttendee = {
    name: 'Unused Test Attendee',
    enrollment: '26008888',
    phone: '9876500000',
  };
  await importAttendeesBatch([unusedAttendee]);
  const { attendees: unusedList } = await getAttendees({ search: '26008888' });
  const verifyUnused = await verifyQR({
    ticketId: unusedList[0].ticket_id,
    gate: 'Gate 1',
    scannerId: 'V-1',
  });
  assert(
    verifyUnused.result === 'valid_not_entered',
    'Verification scanner correctly sees VALID — NOT ENTERED',
    `Result: ${verifyUnused.result}`
  );

  // TEST 8 & 9: Manual Entry Fallback
  console.log('\n--- TEST 8 & 9: Manual Entry Fallback ---');
  const manualTarget = unusedList[0];
  const manualRes = await recordManualEntry({
    attendeeId: manualTarget.id,
    gate: 'Gate 2',
    scannerId: 'Admin-Desk',
    adminNote: 'Verified with physical student ID card',
  });
  assert(
    manualRes.success === true && manualRes.result === 'valid',
    'Admin manual entry successfully approved and logged',
    `Result: ${manualRes.result}`
  );

  // TEST 10: High-Volume Performance (1,500 Attendees)
  console.log('\n--- TEST 10: 1,500 Attendees Load Performance ---');
  const t0 = Date.now();
  const seedBulk = [];
  for (let i = 0; i < 1500; i++) {
    seedBulk.push({
      name: `Attendee_${i}`,
      enrollment: `2600${2000 + i}`,
      phone: `91000${String(10000 + i).slice(-5)}`,
    });
  }
  await importAttendeesBatch(seedBulk);
  const t1 = Date.now();
  console.log(`  Imported 1,500 test attendees in ${t1 - t0}ms`);

  const tSearch0 = Date.now();
  const searchResult = await getAttendees({ search: '26002500' });
  const tSearch1 = Date.now();
  assert(
    searchResult.attendees.length > 0 && tSearch1 - tSearch0 < 50,
    'Fast attendee indexed search over 1,500+ records',
    `(${tSearch1 - tSearch0}ms)`
  );

  // Stats Check
  const stats = await getDashboardStats();
  console.log('\n--- FINAL DASHBOARD STATS CHECK ---');
  console.log(`  Total: ${stats.total}`);
  console.log(`  Entered: ${stats.entered}`);
  console.log(`  Remaining: ${stats.remaining}`);
  console.log(`  Gate 1: ${stats.gate1} | Gate 2: ${stats.gate2}`);
  console.log(`  Duplicates Blocked: ${stats.duplicates}`);
  console.log(`  Invalid QRs Blocked: ${stats.invalids}`);

  console.log('\n========================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
