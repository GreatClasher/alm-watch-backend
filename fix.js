const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin' }); 
client.connect().then(() => client.query("DELETE FROM transcripts WHERE status = 'pending'")).then(res => { console.log('Deleted ' + res.rowCount); client.end(); });
