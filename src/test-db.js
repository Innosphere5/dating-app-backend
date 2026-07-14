import 'dotenv/config';

async function run() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Postgrest Swagger paths:', Object.keys(data.paths || {}));
    console.log('Postgrest definitions:', Object.keys(data.definitions || {}));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
