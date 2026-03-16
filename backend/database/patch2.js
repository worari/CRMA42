const pool = require('./db');
const patch = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS position_history (
        id UUID PRIMARY KEY,
        alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        position_name VARCHAR(200),
        order_number VARCHAR(100),
        start_date DATE,
        end_date DATE
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS rank_history (
        id UUID PRIMARY KEY,
        alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        rank_name VARCHAR(100),
        order_number VARCHAR(100),
        start_date DATE,
        end_date DATE
      );
    `);
    console.log("Migration successful: Position and Rank history tables created");
  } catch(e) { console.error(e); }
  finally { client.release(); pool.end(); }
};
patch();
