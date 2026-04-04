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

if (!fs.existsSync(srcDir)) {
    console.error('Frontend src directory not found');
    process.exit(1);
}

const files = walkDir(srcDir);
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // 1. Revert config.getApiUrl calls back to standard relative strings
    // This makes sure the Vite Proxy works perfectly on local
    content = content.replace(/config\.getApiUrl\(['\"](\/api\/[^'\"]+)['\"]\)/g, "'$1'");
    
    // 2. Fix any remaining full localhost URLs to be relative
    content = content.replace(/http:\/\/localhost:5001\/api/g, '/api');
    content = content.replace(/http:\/\/localhost:5000\/api/g, '/api');
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
        console.log('Fixed:', path.relative(srcDir, file));
    }
});

console.log(`Reverted ${changedCount} files to use relative paths for local development.`);
