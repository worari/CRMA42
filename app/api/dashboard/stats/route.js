import pool from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    // Check authentication
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const monthParam = Number(searchParams.get('month'));
    const selectedMonth = Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam
      : (new Date().getMonth() + 1);

    const totalAlumniResult = await pool.query('SELECT COUNT(*) FROM alumni_profiles');
    const total = parseInt(totalAlumniResult.rows[0].count);

    const rankResult = await pool.query("SELECT rank, COUNT(*) as count FROM alumni_profiles GROUP BY rank");
    const affiliationResult = await pool.query("SELECT affiliation, COUNT(*) as count FROM alumni_profiles GROUP BY affiliation");
    const branchResult = await pool.query("SELECT branch, COUNT(*) as count FROM alumni_profiles GROUP BY branch");
    const retirementResult = await pool.query("SELECT retirement_year, COUNT(*) as count FROM alumni_profiles GROUP BY retirement_year ORDER BY retirement_year ASC");
    const birthdayByMonthResult = await pool.query(`
      SELECT EXTRACT(MONTH FROM date_of_birth)::int AS month, COUNT(*)::int AS count
      FROM alumni_profiles
      GROUP BY EXTRACT(MONTH FROM date_of_birth)
      ORDER BY month ASC
    `);
    const birthdayInMonthResult = await pool.query(`
      SELECT
        id,
        rank,
        first_name,
        last_name,
        nickname,
        date_of_birth,
        EXTRACT(DAY FROM date_of_birth)::int AS birth_day,
        contacts.line_id
      FROM alumni_profiles
      LEFT JOIN contacts ON contacts.alumni_id = alumni_profiles.id
      WHERE EXTRACT(MONTH FROM date_of_birth) = $1
      ORDER BY EXTRACT(DAY FROM date_of_birth) ASC, first_name ASC
    `, [selectedMonth]);

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const todayBirthdaysResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM alumni_profiles
      WHERE EXTRACT(MONTH FROM date_of_birth) = $1
        AND EXTRACT(DAY FROM date_of_birth) = $2
    `, [todayMonth, todayDay]);

    return Response.json({
      total,
      rankDistribution: rankResult.rows,
      affiliationDistribution: affiliationResult.rows,
      branchDistribution: branchResult.rows,
      retirementDistribution: retirementResult.rows,
      birthdayByMonth: birthdayByMonthResult.rows,
      birthdayInMonth: birthdayInMonthResult.rows,
      selectedBirthdayMonth: selectedMonth,
      todayBirthdayCount: todayBirthdaysResult.rows[0]?.count || 0,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return Response.json(
      { error: 'Failed to retrieve stats' },
      { status: 500 }
    );
  }
}
