// Fix Assistants.jsx properly - remove cache, add 401 handling
const fs = require('fs');

console.log('🔧 Fixing Assistants.jsx properly...\n');

// Read the file
let content = fs.readFileSync('frontend/src/pages/Assistants.jsx', 'utf8');

// 1. Remove cacheUtils import
console.log('1. Removing cacheUtils import...');
content = content.replace(
  /import \{ isCacheValid, getCachedData, setCachedData, CACHE_DURATION \} from '\.\.\/utils\/cacheUtils'\n/,
  ''
);

// 2. Add 401 error handler after the ElevenLabs useEffect
console.log('2. Adding 401 error handler...');
content = content.replace(
  /(  \/\/ Fetch ElevenLabs data when providers are loaded[\s\S]*?\}, \[availableProviders\]\))\n\n(  \/\/ Load cached data)/,
  `$1\n\n  // Handle 401 Unauthorized (token expired)\n  const handle401Error = () => {\n    console.log('🔒 Token expired - logging out...')\n    localStorage.clear()\n    alert('Your session has expired. Please log in again.')\n    window.location.href = '/auth'\n  }\n\n$2`
);

// 3. Remove loadCachedData useEffect and function
console.log('3. Removing loadCachedData...');
content = content.replace(
  /  \/\/ Load cached data on component mount\n  useEffect\(\(\) => \{\n    loadCachedData\(\)\n  \}, \[\]\)\n\n  \/\/ Load cached data from localStorage\n  const loadCachedData = \(\) => \{[\s\S]*?\n  \}\n\n/,
  ''
);

// 4. Remove saveAssistantToCache function and useEffect
console.log('4. Removing saveAssistantToCache...');
content = content.replace(
  /  \/\/ Auto-save assistant configurations\n  const saveAssistantToCache = \(assistant\) => \{[\s\S]*?\n  \}\n\n  \/\/ Auto-save when assistant configuration changes\n  useEffect\(\(\) => \{[\s\S]*?\n  \}, \[selectedAssistant\]\)\n\n/,
  ''
);

// 5. Remove all setCachedData calls (keep the line before it)
console.log('5. Removing setCachedData calls...');
content = content.replace(/        \/\/ Cache.*?to localStorage\n        setCachedData\([^)]+\)\n/g, '');
content = content.replace(/          \/\/ Cache to localStorage\n          setCachedData\([^)]+\)\n/g, '');
content = content.replace(/        \/\/ Update cache\n        setCachedData\([^)]+\)\n/g, '');
content = content.replace(/      \/\/ Save to cache immediately\n      setCachedData\([^)]+\)\n/g, '');
content = content.replace(/          \/\/ ✅ UPDATE CACHE - This is critical!\n          setCachedData\([^)]+\)\n/g, '');

// 6. Remove cache fallback in fetchAssistantsFromDB (both occurrences)
console.log('6. Removing cache fallback...');
content = content.replace(/        \/\/ Load from cache as fallback\n        const cachedAssistants = getCachedData\('cached_assistants'\)\n        if \(cachedAssistants && cachedAssistants\.length > 0\) \{\n          setAssistants\(cachedAssistants\)\n          setSelectedAssistant\(cachedAssistants\[0\]\)\n        \}\n/g, '');

// 7. Fix console.log messages
console.log('7. Fixing console.log messages...');
content = content.replace(/console\.log\('✅ LLM Models loaded and cached:/g, "console.log('✅ LLM Models loaded:");
content = content.replace(/console\.log\('✅ Transcribers loaded and cached:/g, "console.log('✅ Transcribers loaded:");
content = content.replace(/console\.log\('✅ Voice models loaded and cached:/g, "console.log('✅ Voice models loaded:");
content = content.replace(/console\.log\('✅ Voices loaded and cached:/g, "console.log('✅ Voices loaded:");
content = content.replace(/console\.log\('✅ Pricing loaded and cached successfully'\)/g, "console.log('✅ Pricing loaded successfully')");
content = content.replace(/console\.log\('✅ Assistant published and cache updated:/g, "console.log('✅ Assistant published:");

// 8. Add 401 check to fetchAssistantsFromDB
console.log('8. Adding 401 check to fetchAssistantsFromDB...');
content = content.replace(
  /(const fetchAssistantsFromDB = async \(\) => \{[\s\S]*?const response = await fetch\('\/api\/assistants', \{[\s\S]*?\}\))\n      const data = await response\.json\(\)/,
  `$1\n      \n      // Handle 401 Unauthorized (token expired)\n      if (response.status === 401) {\n        handle401Error()\n        return\n      }\n      \n      const data = await response.json()`
);

// Write the file
fs.writeFileSync('frontend/src/pages/Assistants.jsx', content);

console.log('\n✅ Assistants.jsx fixed successfully!\n');
console.log('Changes made:');
console.log('  ✅ Removed cacheUtils import');
console.log('  ✅ Added handle401Error function');
console.log('  ✅ Removed loadCachedData');
console.log('  ✅ Removed saveAssistantToCache');
console.log('  ✅ Removed all setCachedData calls');
console.log('  ✅ Removed cache fallback');
console.log('  ✅ Added 401 check to fetchAssistantsFromDB');
console.log('\nNext: Run add-401-handling.js to add 401 checks to other functions');
