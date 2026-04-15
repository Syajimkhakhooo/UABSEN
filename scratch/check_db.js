const SUPABASE_URL = 'https://oichcfklvakrswmnycyi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pY2hjZmtsdmFrcnN3bW55Y3lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU3NjMzMiwiZXhwIjoyMDkxMTUyMzMyfQ.7IRh05DcA_zgRR0PiOPjC3RkDxIHMEZOHHx9AShgAyY';

async function main() {
  const logsRes = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?select=created_at,action,description,metadata&order=created_at.desc&limit=10`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`
    }
  });
  const logs = await logsRes.json();
  console.log('--- RECENT AUDIT LOGS ---');
  console.log(logs);
}

main();
