// Test script untuk API endpoints
// Run dengan: node scripts/test-actual-output.js

const BASE_URL = 'http://localhost:3000';

async function testInsertDataItem() {
    console.log('\n=== Test 1: Insert Data Item (Pass) ===');
    const data = {
        sn: `TEST-SN-${Date.now()}`,
        pn: 'PN123',
        wo: 'WO2024001',
        name_line: 'Line A',
        line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc',
        name_process: 'Assembly',
        status: 'pass',
        created_at: new Date().toISOString(),
    };

    try {
        const response = await fetch(`${BASE_URL}/api/data-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testInsertReject() {
    console.log('\n=== Test 2: Insert Data Item (Reject) ===');
    const data = {
        sn: `TEST-SN-REJECT-${Date.now()}`,
        pn: 'PN123',
        wo: 'WO2024001',
        name_line: 'Line A',
        line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc',
        name_process: 'Assembly',
        status: 'reject',
        created_at: new Date().toISOString(),
    };

    try {
        const response = await fetch(`${BASE_URL}/api/data-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testGetActualOutput() {
    console.log('\n=== Test 3: Get Actual Output ===');
    const params = new URLSearchParams({
        line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc',
        date: new Date().toISOString().split('T')[0],
    });

    try {
        const response = await fetch(`${BASE_URL}/api/actual-output?${params}`);
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testSyncActualOutput() {
    console.log('\n=== Test 4: Sync Actual Output ===');
    const data = {
        line_id: 'a1b2c3d4-e5f6-4789-a012-123456789abc',
        date: new Date().toISOString().split('T')[0],
    };

    try {
        const response = await fetch(`${BASE_URL}/api/actual-output/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function runAllTests() {
    console.log('Starting API Tests...');
    console.log('Make sure the dev server is running on localhost:3000\n');

    await testInsertDataItem();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testInsertReject();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testGetActualOutput();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testSyncActualOutput();

    console.log('\n=== All Tests Completed ===');
}

runAllTests();
