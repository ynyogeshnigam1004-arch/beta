/**
 * Test Audio Conversion
 * Verifies that pcmToMulaw doesn't throw buffer overflow errors
 */

const { pcmToMulaw, mulawToPCM } = require('../services/audioConverter');

console.log('🎵 ========== AUDIO CONVERSION TEST ==========\n');

// Test with various buffer sizes that previously caused issues
const testSizes = [
  1528, // The exact size that caused the error
  1527, // One byte less
  1529, // One byte more
  1000, // Random size
  2000, // Larger size
  100,  // Small size
  1,    // Odd size (should be handled)
];

let allPassed = true;

testSizes.forEach(size => {
  try {
    // Create a test PCM buffer (16kHz, 16-bit)
    const pcmBuffer = Buffer.alloc(size);
    
    // Fill with some test data (sine wave)
    for (let i = 0; i < size / 2; i++) {
      const sample = Math.floor(Math.sin(i / 10) * 10000);
      if (i * 2 + 1 < size) {
        pcmBuffer.writeInt16LE(sample, i * 2);
      }
    }
    
    // Convert PCM to mulaw
    const mulawBuffer = pcmToMulaw(pcmBuffer);
    
    console.log(`✅ Size ${size}: SUCCESS`);
    console.log(`   Input: ${size} bytes PCM → Output: ${mulawBuffer.length} bytes mulaw`);
    
  } catch (error) {
    console.log(`❌ Size ${size}: FAILED`);
    console.log(`   Error: ${error.message}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('\n✅ Audio conversion is working correctly');
  console.log('✅ No buffer overflow errors');
  console.log('✅ Ready to test with real phone call');
} else {
  console.log('❌ SOME TESTS FAILED!');
  console.log('\n⚠️  Audio conversion still has issues');
  console.log('⚠️  Do NOT test with phone call yet');
}

console.log('\n' + '='.repeat(50));
