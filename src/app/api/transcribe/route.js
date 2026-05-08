export async function POST(request) {
  if (!process.env.OPENAI_APIKEY) {
    return Response.json({ error: "OPENAI_APIKEY omgevingsvariabele ontbreekt" }, { status: 500 });
  }

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!audio) {
    return Response.json({ error: "Geen audio ontvangen" }, { status: 400 });
  }

  const openaiForm = new FormData();
  openaiForm.append("file", audio);
  openaiForm.append("model", "whisper-1");
  openaiForm.append("language", "es");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_APIKEY}` },
    body: openaiForm,
  });

  if (!response.ok) {
    const err = await response.text();
    return Response.json({ error: `OpenAI fout ${response.status}: ${err}` }, { status: response.status });
  }

  const data = await response.json();
  return Response.json({ text: data.text });
}
