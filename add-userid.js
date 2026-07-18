const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'modules');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.entity.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Look for lines like "id: uuid('id').primaryKey().defaultRandom(),"
      const idRegex = /id:\s*uuid\('id'\)\.primaryKey\(\)\.defaultRandom\(\),/g;
      
      if (idRegex.test(content) && !content.includes("userId: uuid('user_id')")) {
        content = content.replace(idRegex, "id: uuid('id').primaryKey().defaultRandom(),\n  userId: uuid('user_id').notNull(),");
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(srcDir);
console.log('Done');
