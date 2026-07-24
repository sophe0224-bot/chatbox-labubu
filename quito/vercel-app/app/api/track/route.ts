type TrackEventPayload = {
  userId?: string;
  timestamp?: string;
  message?: string;
};

export async function POST(request: Request) {
  let payload: TrackEventPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = payload.userId?.trim();
  const message = payload.message?.trim();
  const timestamp = payload.timestamp ?? new Date().toISOString();

  if (!userId || !message) {
    return Response.json(
      { error: "userId and message are required" },
      { status: 400 },
    );
  }

  // TODO: persist to a real database (Vercel Postgres, Supabase, etc.)
  // instead of logging. This route is the only place that needs to change.
  console.log("[track]", { userId, timestamp, message });

  return Response.json({ ok: true }, { status: 201 });
}
