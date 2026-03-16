const pool = require('./db');
const crypto = require('crypto');

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS alumni_profiles (
        id UUID PRIMARY KEY,
        profile_photo TEXT,
        military_id VARCHAR(10) UNIQUE NOT NULL,
        rank VARCHAR(50) NOT NULL,
        custom_rank VARCHAR(50),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        nickname VARCHAR(50),
        position VARCHAR(200),
        branch VARCHAR(50) NOT NULL,
        custom_branch VARCHAR(50),
        affiliation VARCHAR(50) NOT NULL,
        status VARCHAR(50),
        date_of_birth DATE NOT NULL,
        retirement_year INTEGER NOT NULL,
        signature_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        alumni_id UUID PRIMARY KEY REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        phone_primary VARCHAR(10),
        phone_secondary VARCHAR(10),
        email VARCHAR(150),
        line_id VARCHAR(100)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS family_data (
        alumni_id UUID PRIMARY KEY REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        sons_count INTEGER DEFAULT 0,
        daughters_count INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        alumni_id UUID PRIMARY KEY REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        house_number VARCHAR(50),
        alley VARCHAR(100),
        road VARCHAR(100),
        subdistrict VARCHAR(100),
        district VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(5)
      );
    `);

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

    // Clean existing data for clean seed
    await client.query('DELETE FROM alumni_profiles');

    // Seed Data
    const ranks = ["พล.อ.", "พล.ท.", "พล.ต.", "พ.อ.(พ.)", "พ.อ.", "พ.ท."];
    const branches = ["ร.", "ม.", "ป.", "ช.", "ส.", "สพ.", "ขส.", "พธ.", "สห.", "ผท."];
    const affiliations = ["ทบ.", "กห.สป.", "บก.ทท.", "ทม.รอ.", "สทป."];
    const provinces = ["กรุงเทพมหานคร", "เชียงใหม่", "ชลบุรี", "ขอนแก่น", "นครราชสีมา", "สงขลา", "สุราษฎร์ธานี", "พระนครศรีอยุธยา", "พิษณุโลก"];
    const names = ["สมชาย", "วิชัย", "สุรศักดิ์", "ประยุทธ์", "ประวิทย์", "อนุพงษ์", "อภิรักษ์", "สมศักดิ์", "ณัฐพล", "ธนาธร", "พิธา", "ชลน่าน", "อนุทิน", "จุรินทร์", "เศรษฐา", "ชัยวุฒิ", "สุชาติ", "ดอน", "วิษณุ", "สุพัฒนพงษ์"];
    const lastnames = ["ใจดี", "รักชาติ", "มุ่งมั่น", "เข้มแข็ง", "ปกป้อง", "กล้าหาญ", "เสรีชน", "รักไทย", "ซื่อตรง", "มั่งคั่ง"];

    console.log('Seeding 20 records...');
    for (let i = 0; i < 20; i++) {
        const id = crypto.randomUUID();
        const fname = names[i];
        const lname = lastnames[i % lastnames.length];
        
        let birthYear = 1964 + Math.floor(Math.random() * 5);
        let birthMonth = Math.floor(Math.random() * 12) + 1;
        let p_date_of_birth = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-15`;
        
        let retireYear = birthYear + 60;
        if (birthMonth >= 10) retireYear += 1;

        const rank = ranks[Math.floor(Math.random() * ranks.length)];
        const branch = branches[Math.floor(Math.random() * branches.length)];
        const affiliation = affiliations[Math.floor(Math.random() * affiliations.length)];
        const province = provinces[Math.floor(Math.random() * provinces.length)];
        
        const mil_id = (1000000000 + i).toString();
        const p1 = "081" + (1000000 + i).toString();

        await client.query(`
            INSERT INTO alumni_profiles (id, military_id, rank, first_name, last_name, nickname, position, branch, affiliation, status, date_of_birth, retirement_year)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [id, mil_id, rank, fname, lname, "หนุ่ม", "ผู้บังคับการ", branch, affiliation, "ปฏิบัติหน้าที่", p_date_of_birth, retireYear]);

        await client.query(`
            INSERT INTO contacts (alumni_id, phone_primary, phone_secondary, email, line_id)
            VALUES ($1, $2, $3, $4, $5)
        `, [id, p1, null, `user${i}@rta.mi.th`, `line_${i}`]);

        await client.query(`
            INSERT INTO family_data (alumni_id, sons_count, daughters_count)
            VALUES ($1, $2, $3)
        `, [id, Math.floor(Math.random() * 3), Math.floor(Math.random() * 3)]);

        await client.query(`
            INSERT INTO addresses (alumni_id, house_number, road, subdistrict, district, province, postal_code)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, "99/9", "ทหารบก", "สามเสน", "ดุสิต", province, "10300"]);
    }

    await client.query('COMMIT');
    console.log('Database Initialization and Seeding Complete!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed', e);
  } finally {
    client.release();
    pool.end();
  }
};

createTables();
