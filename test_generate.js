async function testGenerate() {
  const apiKey = 'AQ.Ab8RN6LIFkbypDGk3lTAzR_hwEuuBXe46r9vUibaVvPvIi-G8w';
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
    });
    const data = await res.json();
    if (res.ok) {
      console.log('SUCCESS! Text generated:', data.candidates[0].content.parts[0].text);
    } else {
      console.log('FAILED!', JSON.stringify(data));
    }
  } catch (err) {
    console.error('Network Error:', err);
  }
}
testGenerate();
