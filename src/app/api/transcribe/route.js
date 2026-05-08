export async function POST(request) {
  const formData = await request.formData();
  const audio = formData.get("audio");

  const openaiForm = new FormData();
  openaiForm.append("file", audio, "audio.webm");
  openaiForm.append("model", "whisper-1");
  openaiForm.append("language", "es");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_APIKEY}` },
    body: openaiForm,
  });

  if (!response.ok) {
    const err = await response.text();
    return Response.json({ error: err }, { status: response.status });
  }

  const data = await response.json();
  return Response.json({ text: data.text });
}
