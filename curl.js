fetch('http://localhost:3000/api/cron/sync-oee', { method: 'POST' }).then(res => res.json()).then(console.log);
