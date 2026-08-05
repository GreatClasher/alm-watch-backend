const fs = require('fs');

async function download() {
  console.log("Fetching...");
  try {
    const res = await fetch("http://localhost:3000/v1/recordings/b9b6e081-aa0b-42c0-8e4f-b43b861a17c2/audio.ogg");
    console.log("Status:", res.status);
    console.log("Headers:", res.headers);
    if (!res.ok) {
      console.log("Error body:", await res.text());
      return;
    }
    const dest = fs.createWriteStream("test_output.ogg");
    for await (const chunk of res.body) {
      dest.write(chunk);
    }
    dest.end();
    console.log("Done. Size:", fs.statSync("test_output.ogg").size);
  } catch (e) {
    console.error(e);
  }
}
download();
