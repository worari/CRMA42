const pool = require('./db');
const patch = async () => {
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS custom_affiliation VARCHAR(100);`);
    console.log("Migration successful: Added custom_affiliation");
  } catch(e) { console.error(e); }
  finally { client.release(); pool.end(); }
};
patch();
