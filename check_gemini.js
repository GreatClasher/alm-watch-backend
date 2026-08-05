async function checkKey() {
  const apiKey = 'AQ.Ab8RN6LIFkbypDGk3lTAzR_hwEuuBXe46r9vUibaVvPvIi-G8w';
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      console.log('SUCCESS! Key is valid. Found ' + data.models?.length + ' models.');
    } else {
      console.log('FAILED!', data.error?.message || JSON.stringify(data));
    }
  } catch (err) {
    console.error('Network Error:', err);
  }
}
checkKey();
