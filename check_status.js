const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin' });
client.connect()
  .then(() => client.query("SELECT * FROM pipeline_runs WHERE recording_id = '86c44dec-1cc3-4aa5-9ed5-49b045c35a5c'"))
  .then(res => { 
    console.log('Pipeline Runs:', res.rows); 
    client.end(); 
  })
  .catch(console.error);
