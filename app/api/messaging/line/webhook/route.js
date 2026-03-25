// app/api/messaging/line/webhook/route.js
// LINE Webhook - รับข้อความ/events จาก LINE Platform

import crypto from 'crypto';
import pool from '@/lib/db';
import { sendLineMessage } from '@/lib/lineMessaging';

export const dynamic = 'force-dynamic';

// ตรวจสอบ signature ของ LINE
function verifySignature(body, signature) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) return false;
  const hmac = crypto.createHmac('sha256', channelSecret);
  const digest = hmac.update(body, 'utf8').digest('base64');
  return digest === signature;
}

// Webhook verification (GET)
export async function GET(req) {
  return Response.json({ status: 'LINE Webhook Active', bot: 'crma42_Bot' });
}

// Receive LINE events (POST)
export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-line-signature');

    // Verify signature
    if (!verifySignature(rawBody, signature)) {
      console.warn('LINE Webhook: Invalid signature');
      return Response.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const data = JSON.parse(rawBody);
    const events = data.events || [];

    // Process each event asynchronously
    await Promise.all(events.map(event => handleEvent(event)));

    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

async function handleEvent(event) {
  const { type, source, replyToken } = event;

  console.log(`LINE Event: ${type} from ${source?.userId}`);

  switch (type) {
    case 'follow': {
      // ผู้ใช้ติดตาม Bot
      const userId = source?.userId;
      if (userId) {
        await handleFollow(userId);
      }
      break;
    }

    case 'message': {
      // ผู้ใช้ส่งข้อความมา
      if (event.message?.type === 'text') {
        await handleTextMessage(event);
      }
      break;
    }

    case 'unfollow': {
      console.log(`User ${source?.userId} unfollowed the bot`);
      break;
    }

    default:
      break;
  }
}

async function handleFollow(userId) {
  // ส่งข้อความต้อนรับ
  const welcomeMessage = `🌟 ยินดีต้อนรับสู่ระบบทำเนียบรุ่น CRMA42!\n\n` +
    `รหัส LINE ของคุณ:\n${userId}\n\n` +
    `📝 กรุณานำรหัสนี้ไปกรอกในระบบที่\ncrma42.rta.mi.th\nเพื่อรับการแจ้งเตือนข่าวสารและงานรุ่น`;

  await sendLineMessage(userId, welcomeMessage);

  // บันทึก event ลง DB (optional)
  try {
    await pool.query(
      'INSERT INTO line_webhook_logs (user_id, event_type, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [userId, 'follow']
    );
  } catch {
    // Log table might not exist yet - continue gracefully
  }
}

async function handleTextMessage(event) {
  const userId = event.source?.userId;
  const text = event.message?.text?.trim();

  if (!userId || !text) return;

  let reply = '';

  const lowerText = text.toLowerCase();

  if (lowerText === 'id' || lowerText === 'รหัสไลน์' || lowerText === 'line id') {
    reply = `🆔 LINE User ID ของคุณ:\n${userId}\n\n` +
      `นำรหัสนี้ไปกรอกในระบบ CRMA42 เพื่อรับแจ้งเตือน`;
  } else if (lowerText === 'help' || lowerText === 'ช่วยเหลือ') {
    reply = `📋 คำสั่งที่ใช้ได้:\n\n` +
      `• พิมพ์ "ID" เพื่อดู LINE User ID\n` +
      `• พิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่ง\n\n` +
      `🌐 ระบบทำเนียบรุ่น: crma42.rta.mi.th`;
  } else {
    reply = `✅ รับข้อความแล้ว\n\nพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งที่ใช้ได้`;
  }

  if (reply) {
    await replyMessage(event.replyToken, reply);
  }
}

async function replyMessage(replyToken, message) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text: message }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Reply error:', err);
    }
  } catch (error) {
    console.error('Error replying to LINE message:', error);
  }
}
