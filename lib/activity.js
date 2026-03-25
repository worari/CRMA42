import pool from './db';
import crypto from 'crypto';

export const logActivity = async (userId, action, entityType, entityId = null, details = {}, req = null) => {
  try {
    const id = crypto.randomUUID();
    const ipAddress =
      req?.headers?.get?.('x-forwarded-for') ||
      req?.headers?.get?.('x-real-ip') ||
      req?.headers?.['x-forwarded-for'] ||
      req?.headers?.['x-real-ip'] ||
      'unknown';
    const userAgent =
      req?.headers?.get?.('user-agent') ||
      req?.headers?.['user-agent'] ||
      'unknown';

    await pool.query(`
      INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, userId, action, entityType, entityId, details, ipAddress, userAgent]);
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error to avoid breaking main functionality
  }
};