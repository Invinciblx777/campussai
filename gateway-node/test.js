/**
 * SafetyHub Gateway — Integration Tests
 * Run: node test.js
 *
 * Tests the gateway server endpoints without needing the ESP32
 * or Supabase. Starts the server, runs tests, then shuts down.
 */

const BASE_URL = 'http://localhost:3000';

// ── Test Helpers ────────────────────────────────────────────
let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅  ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ❌  ${name}`);
        console.log(`      → ${err.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

async function post(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json() };
}

async function get(path) {
    const res = await fetch(`${BASE_URL}${path}`);
    return { status: res.status, data: await res.json() };
}

// ── Test Suite ──────────────────────────────────────────────
async function runTests() {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║   SafetyHub Gateway — Integration Tests      ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    // Wait for server to be ready
    console.log('  ⏳  Waiting for server...');
    let serverReady = false;
    for (let i = 0; i < 10; i++) {
        try {
            await fetch(`${BASE_URL}/health`);
            serverReady = true;
            break;
        } catch {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    if (!serverReady) {
        console.log('  ❌  Server not reachable at ' + BASE_URL);
        console.log('      Start the server first: npm start');
        process.exit(1);
    }
    console.log('  ✅  Server is running\n');

    // ── 1. Health endpoint ────────────────────────────────────
    console.log('─── Health Endpoint ───');

    await test('GET /health returns 200 with gateway online', async () => {
        const { status, data } = await get('/health');
        assert(status === 200, `Expected 200, got ${status}`);
        assert(data.gateway === 'online', 'Gateway should be online');
        assert(data.stats !== undefined, 'Should include stats');
    });

    // ── 2. Valid sensor data ──────────────────────────────────
    console.log('\n─── Valid Payloads ───');

    await test('POST valid sensor data returns 200', async () => {
        const { status, data } = await post('/sensor-data', {
            device_id: 'test-node-01',
            temperature: 24.6,
            humidity: 63.0,
            gasLevel: 350,
            vibration: 0.12,
            alert: 'System Normal',
        });
        assert(status === 200, `Expected 200, got ${status}`);
        assert(data.status === 'ok', `Expected status ok, got ${data.status}`);
    });

    await test('POST minimal payload (device_id + temp + humidity)', async () => {
        const { status, data } = await post('/sensor-data', {
            device_id: 'test-node-02',
            temperature: 30.0,
            humidity: 45.0,
        });
        assert(status === 200, `Expected 200, got ${status}`);
        assert(data.status === 'ok', `Expected status ok`);
    });

    await test('GET /sensor-data returns latest reading', async () => {
        const { status, data } = await get('/sensor-data');
        assert(status === 200, `Expected 200, got ${status}`);
        assert(data.latest !== undefined, 'Should have latest reading');
        assert(data.latest.device_id === 'test-node-02', 'Latest should be test-node-02');
    });

    // ── 3. Invalid payloads ───────────────────────────────────
    console.log('\n─── Invalid Payloads ───');

    await test('POST without device_id returns 400', async () => {
        const { status, data } = await post('/sensor-data', {
            temperature: 25.0,
            humidity: 50.0,
        });
        assert(status === 400, `Expected 400, got ${status}`);
        assert(data.error === 'Validation failed', `Expected validation error`);
    });

    await test('POST without temperature returns 400', async () => {
        const { status, data } = await post('/sensor-data', {
            device_id: 'test',
            humidity: 50.0,
        });
        assert(status === 400, `Expected 400, got ${status}`);
    });

    await test('POST with out-of-range temperature returns 400', async () => {
        const { status, data } = await post('/sensor-data', {
            device_id: 'test',
            temperature: 200.0,
            humidity: 50.0,
        });
        assert(status === 400, `Expected 400, got ${status}`);
    });

    await test('POST with string temperature returns 400', async () => {
        const { status, data } = await post('/sensor-data', {
            device_id: 'test',
            temperature: 'hot',
            humidity: 50.0,
        });
        assert(status === 400, `Expected 400, got ${status}`);
    });

    await test('POST empty body returns 400', async () => {
        const { status, data } = await post('/sensor-data', {});
        assert(status === 400, `Expected 400, got ${status}`);
    });

    // ── 4. 404 handling ───────────────────────────────────────
    console.log('\n─── Error Handling ───');

    await test('GET /nonexistent returns 404', async () => {
        const { status, data } = await get('/nonexistent');
        assert(status === 404, `Expected 404, got ${status}`);
        assert(data.error === 'Not found', 'Should return not found error');
    });

    // ── 5. Multiple rapid requests (rate limit test) ──────────
    console.log('\n─── Rapid Requests ───');

    await test('Multiple rapid POSTs are accepted within rate limit', async () => {
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(post('/sensor-data', {
                device_id: `rapid-test-${i}`,
                temperature: 20 + i,
                humidity: 50 + i,
            }));
        }
        const results = await Promise.all(promises);
        const allOk = results.every(r => r.status === 200);
        assert(allOk, 'All 10 rapid requests should succeed');
    });

    // ── Summary ───────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════════\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
