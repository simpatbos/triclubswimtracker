import { NextRequest, NextResponse } from 'next/server';
import { getAthleteById, getAthleteSwims, getAthleteMedalCount, getDataVersion } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const athleteId = parseInt(id, 10);

  if (!athleteId || isNaN(athleteId)) {
    return NextResponse.json({ error: 'Invalid athlete ID' }, { status: 400 });
  }

  const version = getDataVersion();
  const etag = `W/"ath-${version}-${athleteId}"`;

  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'no-cache',
      },
    });
  }

  const athlete = await getAthleteById(athleteId);
  if (!athlete) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  const [swims, medals] = await Promise.all([
    getAthleteSwims(athleteId, 30),
    getAthleteMedalCount(athleteId),
  ]);

  return NextResponse.json(
    {
      athlete: {
        id: athlete.id,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
        username: athlete.username,
        profile_url: athlete.profile_url,
        last_synced_at: athlete.last_synced_at,
      },
      swims,
      medals,
    },
    {
      headers: {
        ETag: etag,
        'Cache-Control': 'no-cache',
      },
    }
  );
}
