const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walkDir(srcDir);
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replace HTTP URLs
    content = content.replace(/http:\/\/localhost:5001\/api/g, '/api');
    
    // For WS URLs, it should be dynamic or we can leave it to fall back to the proxy in dev
    // and rely on relative protocols in prod. Let's just fix the HTTP ones to relative /api paths.
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
        console.log('Fixed:', path.relative(srcDir, file));
    }
});
console.log('Fixed ' + changedCount + ' files.');
