import { getProvinces, getAmphoes, getDistricts, getZipcode } from '@/lib/thaiAddress';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json({ message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json({ message: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const level = searchParams.get('level') || 'province';
    const query = searchParams.get('q') || '';
    const province = searchParams.get('province') || '';
    const amphoe = searchParams.get('amphoe') || '';
    const district = searchParams.get('district') || '';

    if (level === 'province') {
      return Response.json({ options: getProvinces(query).slice(0, 100) });
    }

    if (level === 'amphoe') {
      if (!province) {
        return Response.json({ options: [] });
      }
      return Response.json({ options: getAmphoes(province, query).slice(0, 100) });
    }

    if (level === 'district') {
      if (!province || !amphoe) {
        return Response.json({ options: [] });
      }
      return Response.json({ options: getDistricts(province, amphoe, query).slice(0, 100) });
    }

    if (level === 'zipcode') {
      if (!province || !amphoe || !district) {
        return Response.json({ zipcode: '' });
      }
      return Response.json({ zipcode: getZipcode(province, amphoe, district) });
    }

    return Response.json({ message: 'Invalid level' }, { status: 400 });
  } catch (error) {
    console.error('Thai address API error:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}
