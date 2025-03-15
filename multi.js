const axios = require('axios');
const fs = require('fs').promises;

const BASE_URL = 'https://prod-api.pinai.tech';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getTokens() {
    try {
        const data = await fs.readFile('token.txt', 'utf8');
        return data.split('\n').map(token => token.trim()).filter(token => token); // Membaca semua token dari file
    } catch (e) {
        console.error('❌ Error reading token.txt:', e.message);
        process.exit(1);
    }
}

async function checkHome(headers) {
    try {
        const res = await axios.get(`${BASE_URL}/home`, { headers });
        const data = res.data;

        console.log('===== Profile Info =====');
        console.log(`👤 Name: ${data.user_info?.name || 'N/A'}`);
        console.log(`✅ Today Check-in: ${data.is_today_checkin ? 'Yes' : 'No'}`);
        console.log(`📊 Current Level: ${data.current_model?.current_level || 'N/A'}`);
        console.log(`⬆️ Next Level Points: ${data.current_model?.next_level_need_point || 'N/A'}`);
        console.log(`⚡ Next Level Power: ${data.current_model?.next_level_add_power || 'N/A'}`);
        console.log(`🔋 Data Power: ${data.data_power || 'N/A'}`);
        console.log(`💎 Pin Points (Number): ${data.pin_points_in_number || 'N/A'}`);
        console.log(`📍 Pin Points: ${data.pin_points || 'N/A'}`);

        return data;
    } catch (e) {
        console.error('🏠 Home: Failed to fetch data');
        return null;
    }
}

async function getRandomTasks(headers) {
    try {
        const res = await axios.get(`${BASE_URL}/task/random_task_list`, { headers });
        console.log('===== Task Info =====');
        console.log('📋 Tasks fetched');
        return res.data;
    } catch (e) {
        console.error('📋 Tasks: Failed to fetch');
        return null;
    }
}

async function claimTask(taskId, headers) {
    try {
        const res = await axios.post(`${BASE_URL}/task/${taskId}/claim`, {}, { headers });
        console.log(`✅ Task ${taskId}: Claimed`);
        return res.data;
    } catch (e) {
        console.error(`❌ Task ${taskId}: Failed to claim`);
        return null;
    }
}

async function collectResources(type, headers, count = 1) {
    try {
        const body = [{ type, count }];
        const res = await axios.post(`${BASE_URL}/home/collect`, body, { headers });
        console.log(`💰 ${type}: Collected`);
        return res.data;
    } catch (e) {
        console.error(`💰 ${type}: Failed to collect`);
        return null;
    }
}

async function runBotForAccount(token) {
    let headers = {
        'accept': 'application/json',
        'accept-language': 'en-US,en;q=0.9',
        'lang': 'en-US',
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`
    };

    console.log(`🚀 Running bot for token: ${token}`);

    // Cek informasi akun
    await checkHome(headers);

    // Ambil tugas acak
    const tasks = await getRandomTasks(headers);
    if (tasks?.data?.length) {
        for (const task of tasks.data) {
            if (task.id) {
                await claimTask(task.id, headers);
                await delay(1000); // Jeda antar klaim tugas
            }
        }
    } else {
        console.log('📋 No tasks available');
    }

    // Mengumpulkan sumber daya
    await collectResources('Twitter', headers);
    await delay(2000);

    await collectResources('Google', headers);
    await delay(2000);

    await collectResources('Telegram', headers);
}

async function start() {
    const tokens = await getTokens();

    for (const token of tokens) {
        try {
            await runBotForAccount(token);
            console.log('✅ Done with this account, switching...');
            await delay(10000); // Jeda sebelum beralih ke akun berikutnya
        } catch (e) {
            console.error('💥 Error with this account:', e.message);
            continue; // Lanjutkan ke akun berikutnya jika ada error
        }
    }

    console.log('🔄 Restarting all accounts in 10 seconds...');
    setTimeout(start, 10000); // Restart loop setelah semua akun diproses
}

// Menangani error global
process.on('unhandledRejection', (e) => console.error('⚠️ Unhandled Rejection:', e.message));
process.on('uncaughtException', (e) => console.error('⚠️ Uncaught Exception:', e.message));

// Mulai bot
start();
