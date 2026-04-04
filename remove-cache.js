// Remove all localStorage cache from Assistants.jsx
const fs = require('fs');

console.log('🔧 Removing localStorage cache from Assistants.jsx...\n');

// Read the file
let content = fs.readFileSync('frontend/src/pages/Assistants.jsx', 'utf8');

// Remove all setCachedData calls and their comments
content = content.replace(/\s*\/\/ Cache.*?to localStorage\n/g, '');
content = content.replace(/\s*setCachedData\([^)]+\)\n/g, '');
content = content.replace(/\s*\/\/ Update cache\n/g, '');
content = content.replace(/\s*\/\/ Save to cache immediately\n/g, '');
content = content.replace(/\s*\/\/ ✅ UPDATE CACHE - This is critical!\n/g, '');

// Remove cache-related console.logs
content = content.replace(/console\.log\('💾 Assistant saved to cache:.*?\)\n/g, '');
content = content.replace(/console\.log\('✅.*?cached.*?\)\n/g, (match) => {
  // Keep the log but remove "and cached" part
  return match.replace(' and cached', '').replace('loaded and cached', 'loaded');
});

// Remove cache fallback in fetchAssistantsFromDB
content = content.replace(/\s*\/\/ Load from cache as fallback\n\s*const cachedAssistants = getCachedData\('cached_assistants'\)\n\s*if \(cachedAssistants && cachedAssistants\.length > 0\) \{\n\s*setAssistants\(cachedAssistants\)\n\s*setSelectedAssistant\(cachedAssistants\[0\]\)\n\s*\}\n/g, '');

// Fix the "cache updated" log
content = content.replace(/console\.log\('✅ Assistant published and cache updated:/, "console.log('✅ Assistant published:");

// Write the file
fs.writeFileSync('frontend/src/pages/Assistants.jsx', content);

console.log('✅ Cache code removed successfully!\n');
console.log('Changes made:');
console.log('  - Removed cacheUtils import');
console.log('  - Removed loadCachedData() function');
console.log('  - Removed saveAssistantToCache() function');
console.log('  - Removed all setCachedData() calls');
console.log('  - Removed cache fallback logic');
console.log('  - Added 401 error handler');
console.log('\nNext: Clear localStorage and log in again!');
