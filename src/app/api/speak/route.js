export async function POST(request) {
  if (!process.env.OPENAI_APIKEY) {
    return Response.json({ error: "OPENAI_APIKEY ontbreekt" }, { status: 500 });
  }
  const { text } = await request.json();

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_APIKEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "nova",
      input: text,
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return Response.json({ error: err }, { status: response.status });
  }

  const audio = await response.arrayBuffer();
  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
