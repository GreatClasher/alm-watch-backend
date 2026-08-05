const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin' });
client.connect()
  .then(() => client.query("SELECT * FROM recordings WHERE id = 'e240132a-c567-4ef6-bd75-ad1fb6f6d409'"))
  .then(res => { 
    console.log('Recordings:', res.rows); 
    client.end(); 
  })
  .catch(e => { console.error(e); client.end(); });
