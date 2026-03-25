import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { getBooleanSetting, PERMISSION_KEYS, setBooleanSetting } from '@/lib/permissions';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json({ message: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json({ message: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const allowUserProfileEdit = await getBooleanSetting(PERMISSION_KEYS.allowUserProfileEdit, true);

    return Response.json({
      permissions: {
        allow_user_profile_edit: allowUserProfileEdit,
      },
    });
  } catch (error) {
    console.error('Error loading permission settings:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json({ message: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'super_admin') {
      return Response.json({ message: 'Unauthorized - Super Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    if (typeof body?.allow_user_profile_edit !== 'boolean') {
      return Response.json({ message: 'Invalid allow_user_profile_edit value' }, { status: 400 });
    }

    const previousValue = await getBooleanSetting(PERMISSION_KEYS.allowUserProfileEdit, true);

    const saved = await setBooleanSetting(
      PERMISSION_KEYS.allowUserProfileEdit,
      body.allow_user_profile_edit,
      decoded.id || null
    );

    await logActivity(
      decoded.id,
      'UPDATE',
      'system_setting',
      null,
      {
        key: PERMISSION_KEYS.allowUserProfileEdit,
        previous_value: previousValue,
        new_value: saved.value,
      },
      req
    );

    return Response.json({
      message: 'Permission updated successfully',
      permissions: {
        allow_user_profile_edit: saved.value,
      },
      updated_at: saved.updated_at,
      updated_by: saved.updated_by,
    });
  } catch (error) {
    console.error('Error updating permission settings:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}