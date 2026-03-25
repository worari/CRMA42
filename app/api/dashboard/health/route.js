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

    // Get data health statistics
    const totalProfiles = await pool.query('SELECT COUNT(*) FROM alumni_profiles');

    const missingPhotos = await pool.query("SELECT COUNT(*) FROM alumni_profiles WHERE profile_photo IS NULL OR profile_photo = ''");

    const missingPhones = await pool.query("SELECT COUNT(*) FROM contacts WHERE phone_primary IS NULL OR phone_primary = ''");

    const missingEmails = await pool.query("SELECT COUNT(*) FROM contacts WHERE email IS NULL OR email = ''");

    const missingAddresses = await pool.query("SELECT COUNT(*) FROM addresses WHERE house_number IS NULL OR house_number = ''");

    const inactiveUsers = await pool.query("SELECT COUNT(*) FROM users WHERE status = 'pending'");

    const healthData = {
      totalProfiles: parseInt(totalProfiles.rows[0].count),
      missingPhotos: parseInt(missingPhotos.rows[0].count),
      missingPhones: parseInt(missingPhones.rows[0].count),
      missingEmails: parseInt(missingEmails.rows[0].count),
      missingAddresses: parseInt(missingAddresses.rows[0].count),
      inactiveUsers: parseInt(inactiveUsers.rows[0].count),
    };

    // Calculate health score
    const totalFields = healthData.totalProfiles * 4; // photo, phone, email, address
    const missingFields = healthData.missingPhotos + healthData.missingPhones +
                         healthData.missingEmails + healthData.missingAddresses;
    const healthScore = totalFields > 0 ? Math.round(((totalFields - missingFields) / totalFields) * 100) : 0;

    return Response.json({
      ...healthData,
      healthScore,
      issues: [
        {
          type: 'missing_photos',
          count: healthData.missingPhotos,
          message: `${healthData.missingPhotos} รายการไม่มีรูปภาพ`,
          severity: 'medium'
        },
        {
          type: 'missing_phones',
          count: healthData.missingPhones,
          message: `${healthData.missingPhones} รายการไม่มีเบอร์โทรศัพท์`,
          severity: 'high'
        },
        {
          type: 'missing_emails',
          count: healthData.missingEmails,
          message: `${healthData.missingEmails} รายการไม่มีอีเมล`,
          severity: 'medium'
        },
        {
          type: 'missing_addresses',
          count: healthData.missingAddresses,
          message: `${healthData.missingAddresses} รายการไม่มีที่อยู่`,
          severity: 'low'
        },
        {
          type: 'inactive_users',
          count: healthData.inactiveUsers,
          message: `${healthData.inactiveUsers} ผู้ใช้รอการอนุมัติ`,
          severity: 'high'
        }
      ].filter(issue => issue.count > 0)
    });
  } catch (error) {
    console.error('Data health error:', error);
    return Response.json(
      { error: 'Failed to retrieve data health' },
      { status: 500 }
    );
  }
}