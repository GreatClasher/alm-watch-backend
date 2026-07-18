const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin' }); 
client.connect()
.then(() => client.query("SELECT u.id, u.text, u.speaker_id, s.name, u.prosody FROM transcripts t JOIN utterances u ON t.id = u.transcript_id LEFT JOIN speakers s ON u.speaker_id = s.id WHERE t.session_id = '52b5e30e-285c-4197-a1a3-8e54a602ae75'"))
.then(res => { console.log(JSON.stringify(res.rows, null, 2)); client.end(); })
.catch(e => { console.error('Error:', e); client.end(); });
