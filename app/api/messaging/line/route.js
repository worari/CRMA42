// app/api/messaging/line/route.js
// LINE Messaging API Endpoint

import {
  sendLineMessage,
  sendBroadcastMessage,
  sendAdminNotification,
} from '@/lib/lineMessaging';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

function buildEventNotificationMessage(event, customMessage = '') {
  if (customMessage && String(customMessage).trim()) {
    return String(customMessage).trim();
  }

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : 'รอประกาศ';

  return `🔔 แจ้งเตือนงานรุ่น CRMA42\n\n📌 ${event.title}\n📅 วันที่: ${dateStr}\n📍 สถานที่: ${event.location || 'รอประกาศ'}\n\nกรุณาตรวจสอบรายละเอียดและยืนยันการเข้าร่วมในระบบทำเนียบรุ่น`;
}

export async function POST(req) {
  try {
    // ✅ Authentication check
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'editor' && decoded.role !== 'super_admin')) {
      return Response.json(
        { success: false, message: 'Insufficient permissions - Editor or Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { type, message, userId, eventId, target } = body;

    let result;

    switch (type) {
      // ── ส่งข้อความหาคนเดียว ───────────────────────────────────────
      case 'single': {
        if (!userId || !message) {
          return Response.json(
            { success: false, message: 'User ID and message are required for single message' },
            { status: 400 }
          );
        }
        result = await sendLineMessage(userId, message);
        break;
      }

      // ── ส่งข้อความประกาศทุกคน ────────────────────────────────────
      case 'broadcast': {
        if (!message) {
          return Response.json(
            { success: false, message: 'Message is required for broadcast' },
            { status: 400 }
          );
        }

        const lineIdsResult = await pool.query(
          "SELECT line_id FROM contacts WHERE line_id IS NOT NULL AND line_id != ''"
        );

        if (lineIdsResult.rows.length === 0) {
          return Response.json(
            { success: false, message: 'ไม่พบ LINE ID ในระบบ กรุณาให้สมาชิกเพิ่ม LINE ID ในโปรไฟล์' },
            { status: 404 }
          );
        }

        const userIds = lineIdsResult.rows.map(row => row.line_id);
        result = await sendBroadcastMessage(userIds, message);
        break;
      }

      // ── แจ้งเตือนงานรุ่นไปยังทุกคน ──────────────────────────────
      case 'event_notification': {
        if (!eventId) {
          return Response.json(
            { success: false, message: 'Event ID is required for event notification' },
            { status: 400 }
          );
        }

        const eventResult = await pool.query(
          `SELECT e.id, e.title, e.event_date, e.location, COUNT(er.id)::INT AS registered_count
           FROM events e
           LEFT JOIN event_registrations er ON er.event_id = e.id
           WHERE e.id = $1
           GROUP BY e.id`,
          [eventId]
        );

        if (eventResult.rows.length === 0) {
          return Response.json(
            { success: false, message: 'Event not found' },
            { status: 404 }
          );
        }

        const event = eventResult.rows[0];
        const targetMode = target === 'all' ? 'all' : 'registered';
        let lineIdsResult;

        if (targetMode === 'registered') {
          lineIdsResult = await pool.query(
            `SELECT DISTINCT c.line_id
             FROM event_registrations er
             JOIN contacts c ON c.alumni_id = er.alumni_id
             WHERE er.event_id = $1
               AND c.line_id IS NOT NULL
               AND c.line_id != ''`,
            [eventId]
          );
        } else {
          lineIdsResult = await pool.query(
            `SELECT DISTINCT line_id
             FROM contacts
             WHERE line_id IS NOT NULL
               AND line_id != ''`
          );
        }

        if (lineIdsResult.rows.length === 0) {
          return Response.json(
            {
              success: false,
              message: targetMode === 'registered'
                ? 'ไม่พบ LINE ID ของผู้ลงทะเบียนงานนี้'
                : 'ไม่พบ LINE ID ในระบบ กรุณาให้สมาชิกเพิ่ม LINE ID ในโปรไฟล์'
            },
            { status: 404 }
          );
        }

        const userIds = lineIdsResult.rows.map((row) => row.line_id);
        const text = buildEventNotificationMessage(event, message);
        result = await sendBroadcastMessage(userIds, text);

        if (result.success) {
          result.event = {
            id: event.id,
            title: event.title,
            registered_count: event.registered_count,
            target: targetMode,
          };
        }
        break;
      }

      // ── ทดสอบส่งข้อความหา Admin ──────────────────────────────────
      case 'test_admin': {
        const testMsg = message || `✅ ทดสอบระบบแจ้งเตือน LINE\n\nระบบ CRMA42 พร้อมใช้งาน\n🕐 ${new Date().toLocaleString('th-TH')}`;
        result = await sendAdminNotification(testMsg);
        break;
      }

      default:
        return Response.json(
          { success: false, message: 'Invalid type. Use: single, broadcast, event_notification, test_admin' },
          { status: 400 }
        );
    }

    if (result.success) {
      return Response.json({
        success: true,
        message: 'ส่งข้อความสำเร็จ',
        ...result,
      });
    } else {
      return Response.json(
        { success: false, message: 'ส่งข้อความไม่สำเร็จ', error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in LINE messaging API:', error);
    return Response.json(
      { success: false, message: 'Server Error', error: error.message },
      { status: 500 }
    );
  }
}