import { NextRequest, NextResponse } from 'next/server';
import { addManualSwim, getAthleteById, deleteSwim } from '@/lib/db';
import { metersToYards, parseChallengeStartDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const athleteIdCookie = request.cookies.get('athlete_id');
    const athleteId = athleteIdCookie ? parseInt(athleteIdCookie.value, 10) : null;

    if (!athleteId || isNaN(athleteId)) {
      return NextResponse.json({ error: 'You must be logged in to record a swim.' }, { status: 401 });
    }

    const athlete = await getAthleteById(athleteId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    const body = await request.json();
    const { date, name, distance, unit = 'yards', durationMinutes = 0, durationSeconds = 0 } = body;

    if (!date) {
      return NextResponse.json({ error: 'Workout date is required.' }, { status: 400 });
    }

    const challengeStartMs = parseChallengeStartDate().getTime();
    const swimDateMs = new Date(`${date.slice(0, 10)}T23:59:59Z`).getTime();
    if (swimDateMs < challengeStartMs) {
      return NextResponse.json(
        { error: 'Swims can only be recorded on or after the challenge start date (Sep 14, 2026).' },
        { status: 400 }
      );
    }

    const rawDist = Number(distance);
    if (isNaN(rawDist) || rawDist <= 0) {
      return NextResponse.json({ error: 'Please enter a valid swim distance greater than 0.' }, { status: 400 });
    }

    const distanceYards = unit === 'meters' ? metersToYards(rawDist) : Math.round(rawDist);
    const totalDurationSeconds = Number(durationMinutes) * 60 + Number(durationSeconds);

    if (totalDurationSeconds <= 0) {
      return NextResponse.json({ error: 'Please enter a valid workout duration greater than 0.' }, { status: 400 });
    }

    const swim = await addManualSwim({
      athleteId: athlete.id,
      date: date.slice(0, 10),
      name: name && String(name).trim() ? String(name).trim() : 'Purdue Tri Swim Workout',
      distanceYards,
      durationSeconds: totalDurationSeconds,
    });

    return NextResponse.json({
      success: true,
      message: 'Swim workout saved and consolidated!',
      swim,
    });
  } catch (err: unknown) {
    console.error('Save swim error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to save swim workout';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const athleteIdCookie = request.cookies.get('athlete_id');
    const athleteId = athleteIdCookie ? parseInt(athleteIdCookie.value, 10) : null;

    if (!athleteId || isNaN(athleteId)) {
      return NextResponse.json({ error: 'You must be logged in to delete a swim.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const swimIdParam = searchParams.get('id');
    const swimId = swimIdParam ? parseInt(swimIdParam, 10) : null;

    if (!swimId || isNaN(swimId)) {
      return NextResponse.json({ error: 'Invalid swim ID' }, { status: 400 });
    }

    await deleteSwim(swimId);
    return NextResponse.json({
      success: true,
      message: 'Swim workout deleted.',
    });
  } catch (err: unknown) {
    console.error('Delete swim error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to delete swim workout';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
