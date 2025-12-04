// Script untuk insert dummy data ke database
// Run dengan: node scripts/insert-dummy-data.js

const BASE_URL = 'http://localhost:3000';

// Data dummy untuk berbagai PN dan line
const dummyData = [
    // PN123 - Line A - Shift 1 - Jam 07:00-09:00
    { sn: 'SN-PN123-001', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T07:15:00Z' },
    { sn: 'SN-PN123-002', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T07:30:00Z' },
    { sn: 'SN-PN123-003', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Testing', status: 'pass', created_at: '2024-11-28T07:45:00Z' },
    { sn: 'SN-PN123-004', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Testing', status: 'reject', created_at: '2024-11-28T07:50:00Z' },

    { sn: 'SN-PN123-005', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T08:10:00Z' },
    { sn: 'SN-PN123-006', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T08:25:00Z' },
    { sn: 'SN-PN123-007', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Testing', status: 'pass', created_at: '2024-11-28T08:40:00Z' },
    { sn: 'SN-PN123-008', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Packaging', status: 'pass', created_at: '2024-11-28T08:55:00Z' },

    // PN123 - Jam 09:00-11:00
    { sn: 'SN-PN123-009', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T09:15:00Z' },
    { sn: 'SN-PN123-010', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T09:30:00Z' },
    { sn: 'SN-PN123-011', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Testing', status: 'reject', created_at: '2024-11-28T09:45:00Z' },

    { sn: 'SN-PN123-012', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T10:10:00Z' },
    { sn: 'SN-PN123-013', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Testing', status: 'pass', created_at: '2024-11-28T10:30:00Z' },
    { sn: 'SN-PN123-014', pn: 'PN123', wo: 'WO2024001', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Packaging', status: 'reject', created_at: '2024-11-28T10:50:00Z' },

    // PN456 - Line C - Shift 1
    { sn: 'SN-PN456-001', pn: 'PN456', wo: 'WO2024003', name_line: 'Line C', line_id: 'c3d4e5f6-a7b8-4901-c234-345678901abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T11:15:00Z' },
    { sn: 'SN-PN456-002', pn: 'PN456', wo: 'WO2024003', name_line: 'Line C', line_id: 'c3d4e5f6-a7b8-4901-c234-345678901abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T11:30:00Z' },
    { sn: 'SN-PN456-003', pn: 'PN456', wo: 'WO2024003', name_line: 'Line C', line_id: 'c3d4e5f6-a7b8-4901-c234-345678901abc', name_process: 'Testing', status: 'pass', created_at: '2024-11-28T11:45:00Z' },

    { sn: 'SN-PN456-004', pn: 'PN456', wo: 'WO2024003', name_line: 'Line C', line_id: 'c3d4e5f6-a7b8-4901-c234-345678901abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T12:10:00Z' },
    { sn: 'SN-PN456-005', pn: 'PN456', wo: 'WO2024003', name_line: 'Line C', line_id: 'c3d4e5f6-a7b8-4901-c234-345678901abc', name_process: 'Testing', status: 'pass', created_at: '2024-11-28T12:30:00Z' },

    // PN1234 - Line B - Shift 1 (Mostly rejects)
    { sn: 'SN-PN1234-001', pn: 'PN1234', wo: 'WO2024002', name_line: 'Line B', line_id: 'b2c3d4e5-f6a7-4890-b123-234567890def', name_process: 'Assembly', status: 'reject', created_at: '2024-11-28T13:15:00Z' },
    { sn: 'SN-PN1234-002', pn: 'PN1234', wo: 'WO2024002', name_line: 'Line B', line_id: 'b2c3d4e5-f6a7-4890-b123-234567890def', name_process: 'Assembly', status: 'reject', created_at: '2024-11-28T13:30:00Z' },
    { sn: 'SN-PN1234-003', pn: 'PN1234', wo: 'WO2024002', name_line: 'Line B', line_id: 'b2c3d4e5-f6a7-4890-b123-234567890def', name_process: 'Testing', status: 'reject', created_at: '2024-11-28T13:45:00Z' },
    { sn: 'SN-PN1234-004', pn: 'PN1234', wo: 'WO2024002', name_line: 'Line B', line_id: 'b2c3d4e5-f6a7-4890-b123-234567890def', name_process: 'Testing', status: 'pass', created_at: '2024-11-28T13:50:00Z' },

    // PN789 - Line A - Shift 1 (Mixed)
    { sn: 'SN-PN789-001', pn: 'PN789', wo: 'WO2024004', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T14:10:00Z' },
    { sn: 'SN-PN789-002', pn: 'PN789', wo: 'WO2024004', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Assembly', status: 'reject', created_at: '2024-11-28T14:25:00Z' },
    { sn: 'SN-PN789-003', pn: 'PN789', wo: 'WO2024004', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Testing', status: 'pass', created_at: '2024-11-28T14:40:00Z' },
    { sn: 'SN-PN789-004', pn: 'PN789', wo: 'WO2024004', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Packaging', status: 'reject', created_at: '2024-11-28T14:55:00Z' },

    { sn: 'SN-PN789-005', pn: 'PN789', wo: 'WO2024004', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Assembly', status: 'pass', created_at: '2024-11-28T15:10:00Z' },
    { sn: 'SN-PN789-006', pn: 'PN789', wo: 'WO2024004', name_line: 'Line A', line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc', name_process: 'Testing', status: 'pass', created_at: '2024-11-28T15:30:00Z' },
];

async function insertDummyData() {
    console.log('🚀 Starting to insert dummy data...\n');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < dummyData.length; i++) {
        const item = dummyData[i];

        try {
            const response = await fetch(`${BASE_URL}/api/data-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
            });

            const result = await response.json();

            if (result.success) {
                successCount++;
                console.log(`✅ [${i + 1}/${dummyData.length}] Inserted: ${item.sn} (${item.pn}, ${item.status})`);
            } else {
                errorCount++;
                console.log(`❌ [${i + 1}/${dummyData.length}] Failed: ${item.sn} - ${result.error}`);
            }

            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            errorCount++;
            console.log(`❌ [${i + 1}/${dummyData.length}] Error: ${item.sn} - ${error.message}`);
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total: ${dummyData.length}`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);

    console.log('\n🔄 Running sync to ensure data consistency...');

    // Sync untuk memastikan data konsisten
    try {
        const syncResponse = await fetch(`${BASE_URL}/api/actual-output/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: '2024-11-28'
            }),
        });

        const syncResult = await syncResponse.json();
        console.log('✅ Sync completed:', syncResult.message);
        console.log(`   Processed: ${syncResult.processed} records`);
    } catch (error) {
        console.log('❌ Sync failed:', error.message);
    }
}

insertDummyData();
