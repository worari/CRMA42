const pool = require('../database/db');

exports.getStats = async (req, res) => {
  try {
    const totalAlumniResult = await pool.query('SELECT COUNT(*) FROM alumni_profiles');
    const total = parseInt(totalAlumniResult.rows[0].count);

    const rankResult = await pool.query("SELECT rank, COUNT(*) as count FROM alumni_profiles GROUP BY rank");
    const affiliationResult = await pool.query("SELECT affiliation, COUNT(*) as count FROM alumni_profiles GROUP BY affiliation");
    const branchResult = await pool.query("SELECT branch, COUNT(*) as count FROM alumni_profiles GROUP BY branch");
    const retirementResult = await pool.query("SELECT retirement_year, COUNT(*) as count FROM alumni_profiles GROUP BY retirement_year ORDER BY retirement_year ASC");

    res.json({
      total,
      rankDistribution: rankResult.rows,
      affiliationDistribution: affiliationResult.rows,
      branchDistribution: branchResult.rows,
      retirementDistribution: retirementResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
};

exports.getMapDistribution = async (req, res) => {
  try {
    const mapResult = await pool.query(`
      SELECT province, COUNT(alumni_profiles.id) as count 
      FROM addresses 
      JOIN alumni_profiles ON addresses.alumni_id = alumni_profiles.id 
      WHERE province IS NOT NULL 
      GROUP BY province
    `);
    res.json(mapResult.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve map data' });
  }
};
