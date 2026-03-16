const pool = require('../database/db');
const crypto = require('crypto');

exports.getAll = async (req, res) => {
  try {
    const { name, affiliation } = req.query;
    let query = `
      SELECT id, military_id, rank, first_name, last_name, nickname, position, branch, affiliation, custom_affiliation, status, profile_photo 
      FROM alumni_profiles 
      WHERE 1=1
    `;
    const params = [];
    
    if (name) {
      params.push(`%${name}%`);
      query += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR nickname ILIKE $${params.length})`;
    }
    
    if (affiliation) {
      params.push(affiliation);
      query += ` AND affiliation = $${params.length}`;
    }
    
    query += ` ORDER BY 
      affiliation ASC,
      CASE rank 
        WHEN 'พล.อ.' THEN 1
        WHEN 'พล.ท.' THEN 2
        WHEN 'พล.ต.' THEN 3
        WHEN 'พ.อ.(พ.)' THEN 4
        WHEN 'พ.อ.' THEN 5
        WHEN 'พ.ท.' THEN 6
        WHEN 'พ.ต.' THEN 7
        WHEN 'ร.อ.' THEN 8
        WHEN 'ร.ท.' THEN 9
        WHEN 'ร.ต.' THEN 10
        ELSE 99 
      END ASC, 
      created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve alumni list' });
  }
};

exports.getDictionary = async (req, res) => {
  const { type } = req.params;
  try {
    let result = [];
    if (type === 'positions') {
      const q1 = await pool.query('SELECT DISTINCT position FROM alumni_profiles WHERE position IS NOT NULL AND position != \'\'');
      const q2 = await pool.query('SELECT DISTINCT position_name as position FROM position_history WHERE position_name IS NOT NULL AND position_name != \'\'');
      const set = new Set([...q1.rows.map(r => r.position), ...q2.rows.map(r => r.position)]);
      result = Array.from(set);
    } else if (type === 'occupations') {
      const q = await pool.query('SELECT DISTINCT occupation FROM children WHERE occupation IS NOT NULL AND occupation != \'\'');
      result = q.rows.map(r => r.occupation);
    } else if (type === 'roads') {
      const q = await pool.query('SELECT DISTINCT road FROM addresses WHERE road IS NOT NULL AND road != \'\'');
      result = q.rows.map(r => r.road);
    } else if (type === 'subdistricts') {
      const q = await pool.query('SELECT DISTINCT subdistrict FROM addresses WHERE subdistrict IS NOT NULL AND subdistrict != \'\'');
      result = q.rows.map(r => r.subdistrict);
    } else if (type === 'districts') {
      const q = await pool.query('SELECT DISTINCT district FROM addresses WHERE district IS NOT NULL AND district != \'\'');
      result = q.rows.map(r => r.district);
    } else if (type === 'provinces') {
      const q = await pool.query('SELECT DISTINCT province FROM addresses WHERE province IS NOT NULL AND province != \'\'');
      result = q.rows.map(r => r.province);
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve dictionary' });
  }
};

exports.getById = async (req, res) => {
  const { id } = req.params;
  try {
    const alumni = await pool.query('SELECT * FROM alumni_profiles WHERE id = $1', [id]);
    if (alumni.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const contact = await pool.query('SELECT * FROM contacts WHERE alumni_id = $1', [id]);
    const family = await pool.query('SELECT * FROM family_data WHERE alumni_id = $1', [id]);
    const address = await pool.query('SELECT * FROM addresses WHERE alumni_id = $1', [id]);
    const children = await pool.query('SELECT * FROM children WHERE alumni_id = $1 ORDER BY birth_date ASC', [id]);
    const position_history = await pool.query('SELECT * FROM position_history WHERE alumni_id = $1 ORDER BY start_date ASC', [id]);
    const rank_history = await pool.query('SELECT * FROM rank_history WHERE alumni_id = $1 ORDER BY start_date ASC', [id]);
    
    res.json({
        ...alumni.rows[0],
        contacts: contact.rows[0] || {},
        family: family.rows[0] || {},
        address: address.rows[0] || {},
        children: children.rows || [],
        position_history: position_history.rows || [],
        rank_history: rank_history.rows || []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
};

exports.create = async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body;
    const id = crypto.randomUUID();
    
    await client.query('BEGIN');
    
    await client.query(`
      INSERT INTO alumni_profiles 
      (id, profile_photo, military_id, rank, custom_rank, first_name, last_name, nickname, position, branch, custom_branch, affiliation, custom_affiliation, status, date_of_birth, retirement_year, signature_image) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `, [id, body.profile_photo, body.military_id, body.rank, body.custom_rank, body.first_name, body.last_name, body.nickname, body.position, body.branch, body.custom_branch, body.affiliation, body.custom_affiliation, body.status, body.date_of_birth, body.retirement_year, body.signature_image]);

    await client.query(`
      INSERT INTO contacts (alumni_id, phone_primary, phone_secondary, email, line_id) 
      VALUES ($1, $2, $3, $4, $5)
    `, [id, body.contacts?.phone_primary, body.contacts?.phone_secondary, body.contacts?.email, body.contacts?.line_id]);

    await client.query(`
      INSERT INTO family_data (alumni_id, sons_count, daughters_count) 
      VALUES ($1, $2, $3)
    `, [id, body.family?.sons_count || 0, body.family?.daughters_count || 0]);

    await client.query(`
      INSERT INTO addresses (alumni_id, house_number, alley, road, subdistrict, district, province, postal_code) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, body.address?.house_number, body.address?.alley, body.address?.road, body.address?.subdistrict, body.address?.district, body.address?.province, body.address?.postal_code]);
    
    if (body.children && Array.isArray(body.children)) {
      for (const child of body.children) {
        if (!child.first_name) continue;
        await client.query(`
          INSERT INTO children (id, alumni_id, title, first_name, last_name, birth_date, occupation)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [crypto.randomUUID(), id, child.title, child.first_name, child.last_name, child.birth_date || null, child.occupation]);
      }
    }

    if (body.position_history && Array.isArray(body.position_history)) {
      for (const ph of body.position_history) {
        if (!ph.position_name) continue;
        await client.query(`
          INSERT INTO position_history (id, alumni_id, position_name, order_number, start_date, end_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [crypto.randomUUID(), id, ph.position_name, ph.order_number, ph.start_date || null, ph.end_date || null]);
      }
    }

    if (body.rank_history && Array.isArray(body.rank_history)) {
      for (const rh of body.rank_history) {
        if (!rh.rank_name) continue;
        await client.query(`
          INSERT INTO rank_history (id, alumni_id, rank_name, order_number, start_date, end_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [crypto.randomUUID(), id, rh.rank_name, rh.order_number, rh.start_date || null, rh.end_date || null]);
      }
    }

    await client.query('COMMIT');
    
    const io = req.app.get('io');
    if (io) {
      io.emit('ALUMNI_CREATED', { id, ...body });
    }
    
    res.status(201).json({ message: 'Profile created successfully', id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Creation failed', details: error.message });
  } finally {
    client.release();
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const body = req.body;
    await client.query('BEGIN');
    
    await client.query(`
      UPDATE alumni_profiles SET 
        profile_photo=$2, military_id=$3, rank=$4, custom_rank=$5, first_name=$6, last_name=$7, nickname=$8, position=$9, branch=$10, custom_branch=$11, affiliation=$12, custom_affiliation=$13, status=$14, date_of_birth=$15, retirement_year=$16, signature_image=$17
      WHERE id=$1
    `, [id, body.profile_photo, body.military_id, body.rank, body.custom_rank, body.first_name, body.last_name, body.nickname, body.position, body.branch, body.custom_branch, body.affiliation, body.custom_affiliation, body.status, body.date_of_birth, body.retirement_year, body.signature_image]);

    await client.query(`
      UPDATE contacts SET phone_primary=$2, phone_secondary=$3, email=$4, line_id=$5 WHERE alumni_id=$1
    `, [id, body.contacts?.phone_primary, body.contacts?.phone_secondary, body.contacts?.email, body.contacts?.line_id]);

    await client.query(`
      UPDATE family_data SET sons_count=$2, daughters_count=$3 WHERE alumni_id=$1
    `, [id, body.family?.sons_count || 0, body.family?.daughters_count || 0]);

    await client.query(`
      UPDATE addresses SET house_number=$2, alley=$3, road=$4, subdistrict=$5, district=$6, province=$7, postal_code=$8 WHERE alumni_id=$1
    `, [id, body.address?.house_number, body.address?.alley, body.address?.road, body.address?.subdistrict, body.address?.district, body.address?.province, body.address?.postal_code]);
    
    await client.query('DELETE FROM children WHERE alumni_id = $1', [id]);
    if (body.children && Array.isArray(body.children)) {
      for (const child of body.children) {
        if (!child.first_name) continue;
        await client.query(`
          INSERT INTO children (id, alumni_id, title, first_name, last_name, birth_date, occupation)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [crypto.randomUUID(), id, child.title, child.first_name, child.last_name, child.birth_date || null, child.occupation]);
      }
    }

    await client.query('DELETE FROM position_history WHERE alumni_id = $1', [id]);
    if (body.position_history && Array.isArray(body.position_history)) {
      for (const ph of body.position_history) {
        if (!ph.position_name) continue;
        await client.query(`
          INSERT INTO position_history (id, alumni_id, position_name, order_number, start_date, end_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [crypto.randomUUID(), id, ph.position_name, ph.order_number, ph.start_date || null, ph.end_date || null]);
      }
    }

    await client.query('DELETE FROM rank_history WHERE alumni_id = $1', [id]);
    if (body.rank_history && Array.isArray(body.rank_history)) {
      for (const rh of body.rank_history) {
        if (!rh.rank_name) continue;
        await client.query(`
          INSERT INTO rank_history (id, alumni_id, rank_name, order_number, start_date, end_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [crypto.randomUUID(), id, rh.rank_name, rh.order_number, rh.start_date || null, rh.end_date || null]);
      }
    }

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.emit('ALUMNI_UPDATED', { id, ...body });
    }

    res.json({ message: 'Profile updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Update failed', details: error.message });
  } finally {
    client.release();
  }
};

exports.deleteRecord = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM alumni_profiles WHERE id = $1', [id]);
    
    const io = req.app.get('io');
    if (io) {
      io.emit('ALUMNI_DELETED', id);
    }
    
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Deletion failed' });
  }
};
