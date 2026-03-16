const pool = require('./db');
const patch = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS children (
        id UUID PRIMARY KEY,
        alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        title VARCHAR(50),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        birth_date DATE,
        occupation VARCHAR(100)
      );
    `);
    console.log("Migration successful: Children table created");
  } catch(e) { console.error(e); }
  finally { client.release(); pool.end(); }
};
patch();
