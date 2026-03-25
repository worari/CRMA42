// lib/lineMessaging.js
// LINE Messaging API Integration using @line/bot-sdk v8+

const LINE_API_BASE = 'https://api.line.me/v2/bot';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const ADMIN_USER_ID = process.env.LINE_USER_ID; // U4985c723d1186626147a8519860aaabe

/**
 * Send a push message to a single LINE user
 * @param {string} userId - LINE User ID (starts with U)
 * @param {string|object} message - Plain text or LINE message object
 */
export const sendLineMessage = async (userId, message) => {
  try {
    const messageObj = typeof message === 'string'
      ? { type: 'text', text: message }
      : message;

    const response = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [messageObj],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('LINE API Error:', errorData);
      return { success: false, error: errorData.message || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending LINE message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a push message to multiple LINE users
 * @param {string[]} userIds - Array of LINE User IDs
 * @param {string} message - Plain text message
 */
export const sendBroadcastMessage = async (userIds, message) => {
  if (!userIds || userIds.length === 0) {
    return { success: false, error: 'No user IDs provided' };
  }

  const msgObj = typeof message === 'string'
    ? { type: 'text', text: message }
    : message;

  // LINE allows max 500 recipients per multicast call
  const BATCH_SIZE = 500;
  let successful = 0;
  let failed = 0;

  try {
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);

      // Use multicast endpoint for efficiency (up to 500 recipients)
      const response = await fetch(`${LINE_API_BASE}/message/multicast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: batch,
          messages: [msgObj],
        }),
      });

      if (response.ok) {
        successful += batch.length;
      } else {
        const err = await response.json();
        console.error('Multicast batch error:', err);
        failed += batch.length;
      }
    }

    return { success: true, successful, failed, total: userIds.length };
  } catch (error) {
    console.error('Error sending broadcast message:', error);
    return { success: false, error: error.message, successful, failed };
  }
};

/**
 * Send event notification to all alumni with LINE ID in the database
 * @param {string} eventTitle
 * @param {string|Date} eventDate
 * @param {string} eventLocation
 */
export const sendEventNotification = async (eventTitle, eventDate, eventLocation) => {
  try {
    const { default: pool } = await import('./db.js');
    const result = await pool.query(
      "SELECT line_id FROM contacts WHERE line_id IS NOT NULL AND line_id != ''"
    );

    if (result.rows.length === 0) {
      return { success: false, message: 'ไม่พบ LINE ID ในระบบ' };
    }

    const userIds = result.rows.map(row => row.line_id);

    const dateStr = eventDate
      ? new Date(eventDate).toLocaleDateString('th-TH', {
          year: 'numeric', month: 'long', day: 'numeric'
        })
      : 'รอประกาศ';

    const message = `🔔 แจ้งเตือนงานรุ่น CRMA42\n\n📌 ${eventTitle}\n📅 วันที่: ${dateStr}\n📍 สถานที่: ${eventLocation || 'รอประกาศ'}\n\nกรุณาตอบรับเข้าร่วมงานผ่านระบบทำเนียบรุ่น crma42.rta.mi.th`;

    return await sendBroadcastMessage(userIds, message);
  } catch (error) {
    console.error('Error sending event notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a welcome notification to the Admin (for testing)
 * Uses the LINE_USER_ID from env
 */
export const sendAdminNotification = async (message) => {
  if (!ADMIN_USER_ID) {
    return { success: false, error: 'LINE_USER_ID not configured in environment' };
  }
  return await sendLineMessage(ADMIN_USER_ID, message);
};

/**
 * Send a flex message (rich card) to a single user
 * @param {string} userId
 * @param {object} flexContents - LINE Flex Message contents object
 * @param {string} altText - Alternative text for notifications
 */
export const sendFlexMessage = async (userId, flexContents, altText = 'แจ้งเตือน') => {
  try {
    const response = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{
          type: 'flex',
          altText,
          contents: flexContents,
        }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending flex message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify LINE webhook signature
 * @param {string} body - Raw request body string
 * @param {string} signature - X-Line-Signature header value
 */
export const verifyWebhookSignature = (body, signature) => {
  const crypto = require('crypto');
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const hmac = crypto.createHmac('sha256', channelSecret);
  const digest = hmac.update(body).digest('base64');
  return digest === signature;
};