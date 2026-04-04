/**
 * Audio Format Converter
 * Converts between Twilio's mulaw format and AI pipeline's PCM format
 */

/**
 * Convert mulaw (8kHz, 8-bit) to PCM (16kHz, 16-bit)
 * @param {Buffer} mulawBuffer - mulaw audio data
 * @returns {Buffer} - PCM audio data
 */
function mulawToPCM(mulawBuffer) {
  // mulaw to linear PCM conversion table
  const MULAW_TO_LINEAR = [
    -32124,-31100,-30076,-29052,-28028,-27004,-25980,-24956,
    -23932,-22908,-21884,-20860,-19836,-18812,-17788,-16764,
    -15996,-15484,-14972,-14460,-13948,-13436,-12924,-12412,
    -11900,-11388,-10876,-10364, -9852, -9340, -8828, -8316,
     -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
     -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
     -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
     -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
     -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
     -1372, -1308, -1244, -1180, -1116, -1052,  -988,  -924,
      -876,  -844,  -812,  -780,  -748,  -716,  -684,  -652,
      -620,  -588,  -556,  -524,  -492,  -460,  -428,  -396,
      -372,  -356,  -340,  -324,  -308,  -292,  -276,  -260,
      -244,  -228,  -212,  -196,  -180,  -164,  -148,  -132,
      -120,  -112,  -104,   -96,   -88,   -80,   -72,   -64,
       -56,   -48,   -40,   -32,   -24,   -16,    -8,     0,
     32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
     23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
     15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
     11900, 11388, 10876, 10364,  9852,  9340,  8828,  8316,
      7932,  7676,  7420,  7164,  6908,  6652,  6396,  6140,
      5884,  5628,  5372,  5116,  4860,  4604,  4348,  4092,
      3900,  3772,  3644,  3516,  3388,  3260,  3132,  3004,
      2876,  2748,  2620,  2492,  2364,  2236,  2108,  1980,
      1884,  1820,  1756,  1692,  1628,  1564,  1500,  1436,
      1372,  1308,  1244,  1180,  1116,  1052,   988,   924,
       876,   844,   812,   780,   748,   716,   684,   652,
       620,   588,   556,   524,   492,   460,   428,   396,
       372,   356,   340,   324,   308,   292,   276,   260,
       244,   228,   212,   196,   180,   164,   148,   132,
       120,   112,   104,    96,    88,    80,    72,    64,
        56,    48,    40,    32,    24,    16,     8,     0
  ];

  // Convert mulaw to 16-bit PCM at 8kHz
  const pcm8k = Buffer.alloc(mulawBuffer.length * 2);
  for (let i = 0; i < mulawBuffer.length; i++) {
    const sample = MULAW_TO_LINEAR[mulawBuffer[i]];
    pcm8k.writeInt16LE(sample, i * 2);
  }

  // Upsample from 8kHz to 16kHz (simple linear interpolation)
  const pcm16k = Buffer.alloc(pcm8k.length * 2);
  for (let i = 0; i < pcm8k.length / 2; i++) {
    const sample = pcm8k.readInt16LE(i * 2);
    // Write original sample
    pcm16k.writeInt16LE(sample, i * 4);
    // Interpolate next sample
    if (i < pcm8k.length / 2 - 1) {
      const nextSample = pcm8k.readInt16LE((i + 1) * 2);
      const interpolated = Math.floor((sample + nextSample) / 2);
      pcm16k.writeInt16LE(interpolated, i * 4 + 2);
    } else {
      pcm16k.writeInt16LE(sample, i * 4 + 2);
    }
  }

  return pcm16k;
}

/**
 * Convert PCM (16kHz, 16-bit) to mulaw (8kHz, 8-bit)
 * @param {Buffer} pcmBuffer - PCM audio data
 * @returns {Buffer} - mulaw audio data
 */
function pcmToMulaw(pcmBuffer) {
  // Linear PCM to mulaw conversion
  const LINEAR_TO_MULAW = (sample) => {
    const MULAW_MAX = 0x1FFF;
    const MULAW_BIAS = 33;
    
    let sign = (sample >> 8) & 0x80;
    if (sign) sample = -sample;
    if (sample > MULAW_MAX) sample = MULAW_MAX;
    
    sample = sample + MULAW_BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1);
    
    const mantissa = (sample >> (exponent + 3)) & 0x0F;
    const mulaw = ~(sign | (exponent << 4) | mantissa);
    
    return mulaw & 0xFF;
  };

  // Ensure buffer length is even (divisible by 2 for 16-bit samples)
  const evenLength = pcmBuffer.length - (pcmBuffer.length % 2);
  const evenPcmBuffer = pcmBuffer.slice(0, evenLength);
  
  // Downsample from 16kHz to 8kHz (take every other sample)
  // Each sample is 2 bytes (16-bit), and we're taking every other sample
  // So output size = (input samples / 2) * 2 bytes = input length / 2
  const numSamples = evenPcmBuffer.length / 2; // Total 16-bit samples in input
  const downsampledSamples = Math.floor(numSamples / 2); // Take every other sample
  const pcm8k = Buffer.alloc(downsampledSamples * 2); // 2 bytes per sample
  
  for (let i = 0; i < downsampledSamples; i++) {
    // Read every other sample (skip one sample each time)
    const sample = evenPcmBuffer.readInt16LE(i * 4);
    pcm8k.writeInt16LE(sample, i * 2);
  }

  // Convert 16-bit PCM to mulaw
  const mulaw = Buffer.alloc(pcm8k.length / 2);
  for (let i = 0; i < pcm8k.length / 2; i++) {
    const sample = pcm8k.readInt16LE(i * 2);
    mulaw[i] = LINEAR_TO_MULAW(sample);
  }

  return mulaw;
}

/**
 * Convert base64 mulaw to PCM buffer
 * @param {string} base64Mulaw - Base64 encoded mulaw audio
 * @returns {Buffer} - PCM audio buffer
 */
function base64MulawToPCM(base64Mulaw) {
  const mulawBuffer = Buffer.from(base64Mulaw, 'base64');
  return mulawToPCM(mulawBuffer);
}

/**
 * Convert PCM buffer to base64 mulaw
 * @param {Buffer} pcmBuffer - PCM audio buffer
 * @returns {string} - Base64 encoded mulaw audio
 */
function pcmToBase64Mulaw(pcmBuffer) {
  const mulawBuffer = pcmToMulaw(pcmBuffer);
  return mulawBuffer.toString('base64');
}

module.exports = {
  mulawToPCM,
  pcmToMulaw,
  base64MulawToPCM,
  pcmToBase64Mulaw
};
