// app/api/fund/route.js
import pool from '@/lib/db';
import crypto from 'crypto';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function ensureFundSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS fund_purposes (
      id UUID PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      target_amount NUMERIC(12, 2),
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS fund_contributions (
      id UUID PRIMARY KEY,
      alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE SET NULL,
      alumni_name VARCHAR(200) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      purpose VARCHAR(200),
      note TEXT,
      payment_method VARCHAR(50) DEFAULT 'โอนเงิน',
      slip_image TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      approved_by UUID REFERENCES users(id),
      contribution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      approved_at TIMESTAMP
    )
  `);

  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS alumni_name VARCHAR(200)');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS purpose VARCHAR(200)');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS note TEXT');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS slip_image TEXT');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id)');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP');
  await client.query("ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'income'");
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS expense_category VARCHAR(200)');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES users(id)');
  await client.query('ALTER TABLE fund_contributions ALTER COLUMN contribution_date SET DEFAULT CURRENT_DATE');
  await client.query("UPDATE fund_contributions SET transaction_type = 'income' WHERE transaction_type IS NULL OR transaction_type = ''");

  const columnResult = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fund_contributions'
  `);
  const columns = new Set(columnResult.rows.map((row) => row.column_name));

  if (columns.has('notes')) {
    await client.query(`
      UPDATE fund_contributions
      SET note = notes
      WHERE note IS NULL AND notes IS NOT NULL
    `);
  }

  if (columns.has('receipt_image')) {
    await client.query(`
      UPDATE fund_contributions
      SET slip_image = receipt_image
      WHERE slip_image IS NULL AND receipt_image IS NOT NULL
    `);
  }

  const defaultPurposes = [
    { name: 'กองทุนทั่วไป', target_amount: null, description: 'สนับสนุนกิจกรรมรุ่นทั่วไป' },
    { name: 'งานเลี้ยงรุ่น', target_amount: 500000, description: 'สำหรับจัดงานเลี้ยงรุ่นประจำปี' },
    { name: 'ช่วยเหลือสมาชิก', target_amount: 200000, description: 'ช่วยเหลือสมาชิกที่ประสบปัญหา' },
  ];

  for (const purpose of defaultPurposes) {
    await client.query(
      `
        INSERT INTO fund_purposes (id, name, target_amount, description)
        SELECT $1::uuid, $2::varchar(200), $3::numeric, $4::text
        WHERE NOT EXISTS (
          SELECT 1 FROM fund_purposes WHERE name = $5::varchar(200)
        )
      `,
      [crypto.randomUUID(), purpose.name, purpose.target_amount, purpose.description, purpose.name]
    );
  }
}

// GET — ดึงยอดรวม + รายการสมทบ
export async function GET(req) {
  const client = await pool.connect();
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ message: 'Invalid token' }, { status: 401 });

    await ensureFundSchema(client);

    const [incomeQ, expenseQ, pendingQ, contributions, purposes, monthlySummary] = await Promise.all([
      client.query(`
        SELECT COALESCE(SUM(amount), 0)::FLOAT AS total
        FROM fund_contributions
        WHERE status = 'approved' AND COALESCE(transaction_type, 'income') = 'income'
      `),
      client.query(`
        SELECT COALESCE(SUM(amount), 0)::FLOAT AS total
        FROM fund_contributions
        WHERE status = 'approved' AND COALESCE(transaction_type, 'income') = 'expense'
      `),
      client.query(`SELECT COALESCE(SUM(amount), 0)::FLOAT AS total FROM fund_contributions WHERE status = 'pending'`),
      client.query(`
        SELECT fc.*, ap.rank, ap.first_name AS alumni_first, ap.last_name AS alumni_last
        FROM fund_contributions fc
        LEFT JOIN alumni_profiles ap ON fc.alumni_id = ap.id
        ORDER BY fc.contribution_date DESC
      `),
      client.query(`SELECT * FROM fund_purposes WHERE is_active = TRUE ORDER BY name`),
      client.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', contribution_date), 'YYYY-MM') AS month,
          COALESCE(SUM(CASE WHEN COALESCE(transaction_type, 'income') = 'income' AND status = 'approved' THEN amount ELSE 0 END), 0)::FLOAT AS income,
          COALESCE(SUM(CASE WHEN COALESCE(transaction_type, 'income') = 'expense' AND status = 'approved' THEN amount ELSE 0 END), 0)::FLOAT AS expense
        FROM fund_contributions
        WHERE contribution_date >= DATE_TRUNC('year', CURRENT_DATE)
        GROUP BY DATE_TRUNC('month', contribution_date)
        ORDER BY DATE_TRUNC('month', contribution_date) DESC
      `)
    ]);

    const totalIncome = incomeQ.rows[0].total;
    const totalExpense = expenseQ.rows[0].total;

    return Response.json({
      total_approved: totalIncome,
      total_income_approved: totalIncome,
      total_expense_approved: totalExpense,
      total_balance: totalIncome - totalExpense,
      total_pending: pendingQ.rows[0].total,
      contributions: contributions.rows,
      purposes: purposes.rows,
      monthly_summary: monthlySummary.rows,
    });
  } catch (error) {
    console.error('Fund GET error:', error);
    return Response.json({ error: 'Failed to retrieve fund data' }, { status: 500 });
  } finally {
    client.release();
  }
}

// POST — บันทึกการสมทบใหม่
export async function POST(req) {
  const client = await pool.connect();
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ message: 'Invalid token' }, { status: 401 });

    const {
      alumni_id,
      alumni_name,
      amount,
      purpose,
      note,
      payment_method,
      slip_image,
      transaction_type,
      expense_category,
      contribution_date,
    } = await req.json();
    const normalizedAmount = Number(amount);
    const normalizedAlumniId = typeof alumni_id === 'string' && alumni_id.trim() ? alumni_id.trim() : null;
    const normalizedType = String(transaction_type || 'income').trim().toLowerCase() === 'expense' ? 'expense' : 'income';
    const normalizedDate = contribution_date ? String(contribution_date).slice(0, 10) : null;

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return Response.json({ message: 'กรุณาระบุจำนวนเงินที่ถูกต้อง' }, { status: 400 });
    }
    if (!alumni_name) {
      if (normalizedType === 'income') {
        return Response.json({ message: 'กรุณาระบุชื่อผู้สมทบ' }, { status: 400 });
      }
    }

    if (normalizedType === 'expense' && decoded.role !== 'editor' && decoded.role !== 'super_admin') {
      return Response.json({ message: 'เฉพาะผู้ดูแลเท่านั้นที่บันทึกรายจ่ายได้' }, { status: 403 });
    }

    await client.query('BEGIN');
    await ensureFundSchema(client);

    const id = crypto.randomUUID();
    const entryName =
      normalizedType === 'expense'
        ? (alumni_name || `${decoded.first_name || ''} ${decoded.last_name || ''}`.trim() || 'ผู้ดูแลระบบ')
        : alumni_name;
    const entryStatus = normalizedType === 'expense' ? 'approved' : 'pending';

    if (normalizedAlumniId) {
      await client.query(
        `
          INSERT INTO fund_contributions
            (id, alumni_id, alumni_name, amount, purpose, note, payment_method, slip_image, status, transaction_type, expense_category, contribution_date, recorded_by)
          VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::date, CURRENT_DATE), $13)
        `,
        [
          id,
          normalizedAlumniId,
          entryName,
          normalizedAmount,
          purpose || (normalizedType === 'expense' ? 'รายจ่ายกองทุน' : 'กองทุนทั่วไป'),
          note || null,
          payment_method || (normalizedType === 'expense' ? 'จ่ายออก' : 'โอนเงิน'),
          slip_image || null,
          entryStatus,
          normalizedType,
          normalizedType === 'expense' ? (expense_category || null) : null,
          normalizedDate,
          decoded.id || null,
        ]
      );
    } else {
      await client.query(
        `
          INSERT INTO fund_contributions
            (id, alumni_id, alumni_name, amount, purpose, note, payment_method, slip_image, status, transaction_type, expense_category, contribution_date, recorded_by)
          VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::date, CURRENT_DATE), $12)
        `,
        [
          id,
          entryName,
          normalizedAmount,
          purpose || (normalizedType === 'expense' ? 'รายจ่ายกองทุน' : 'กองทุนทั่วไป'),
          note || null,
          payment_method || (normalizedType === 'expense' ? 'จ่ายออก' : 'โอนเงิน'),
          slip_image || null,
          entryStatus,
          normalizedType,
          normalizedType === 'expense' ? (expense_category || null) : null,
          normalizedDate,
          decoded.id || null,
        ]
      );
    }

    await client.query('COMMIT');

    return Response.json({
      message: normalizedType === 'expense'
        ? 'บันทึกรายจ่ายสำเร็จ'
        : 'บันทึกการสมทบสำเร็จ รอการอนุมัติจาก Admin',
      id
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fund POST error:', error);
    return Response.json(
      {
        error: 'Failed to record contribution',
        ...(process.env.NODE_ENV !== 'production' ? { detail: error.message } : {}),
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
