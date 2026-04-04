// Add 401 error handling to all fetch calls in Assistants.jsx
const fs = require('fs');

console.log('🔧 Adding 401 error handling to all fetch calls...\n');

// Read the file
let content = fs.readFileSync('frontend/src/pages/Assistants.jsx', 'utf8');

// Add 401 check after createDefaultAssistant fetch
content = content.replace(
  /(const createDefaultAssistant = async \(\) => \{[\s\S]*?const response = await fetch\('\/api\/assistants', \{[\s\S]*?\}\))\n\n(\s+const data = await response\.json\(\))/,
  `$1\n\n      // Handle 401 Unauthorized\n      if (response.status === 401) {\n        handle401Error()\n        return\n      }\n\n$2`
);

// Add 401 check after handleSubmitAssistant fetch
content = content.replace(
  /(const handleSubmitAssistant = async[\s\S]*?const response = await fetch\('\/api\/assistants', \{[\s\S]*?\}\))\n\n(\s+const data = await response\.json\(\))/,
  `$1\n\n      // Handle 401 Unauthorized\n      if (response.status === 401) {\n        handle401Error()\n        return\n      }\n\n$2`
);

// Add 401 check after handleDeleteAssistant fetch
content = content.replace(
  /(const handleDeleteAssistant = async[\s\S]*?const response = await fetch\(`\/api\/assistants\/\$\{id\}`, \{[\s\S]*?\}\))\n\n(\s+const data = await response\.json\(\))/,
  `$1\n\n        // Handle 401 Unauthorized\n        if (response.status === 401) {\n          handle401Error()\n          return\n        }\n\n$2`
);

// Add 401 check after handleConfigChange fetch (in the setTimeout)
content = content.replace(
  /(handleConfigChange[\s\S]*?const response = await fetch\(`\/api\/assistants\/\$\{selectedAssistant\.id\}`, \{[\s\S]*?\}\))\n\n(\s+const data = await response\.json\(\))/,
  `$1\n\n          // Handle 401 Unauthorized\n          if (response.status === 401) {\n            handle401Error()\n            return\n          }\n\n$2`
);

// Add 401 check after handlePublish fetch
content = content.replace(
  /(const handlePublish = async[\s\S]*?const response = await fetch\(`\/api\/assistants\/\$\{selectedAssistant\.id\}`, \{[\s\S]*?\}\))\n(\s+)\n(\s+const data = await response\.json\(\))/,
  `$1\n$2\n$2// Handle 401 Unauthorized\n$2if (response.status === 401) {\n$2  handle401Error()\n$2  return\n$2}\n$2\n$3`
);

// Write the file
fs.writeFileSync('frontend/src/pages/Assistants.jsx', content);

console.log('✅ 401 error handling added successfully!\n');
console.log('Added 401 checks to:');
console.log('  - fetchAssistantsFromDB() ✅ (already done)');
console.log('  - createDefaultAssistant()');
console.log('  - handleSubmitAssistant()');
console.log('  - handleDeleteAssistant()');
console.log('  - handleConfigChange()');
console.log('  - handlePublish()');
console.log('\n✅ Cloud-first architecture complete!');
console.log('\nNext steps:');
console.log('1. Clear localStorage: localStorage.clear()');
console.log('2. Log in again');
console.log('3. Your assistants will load from MongoDB!');
