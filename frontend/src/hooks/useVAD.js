/**
 * Voice Activity Detection Hook
 * Uses @ricky0123/vad-react for speech detection
 */

import { useMicVAD } from '@ricky0123/vad-react'
import { useRef, useCallback } from 'react'

export const useVAD = ({ onSpeechStart, onSpeechEnd, onAudioData }) => {
  const audioChunksRef = useRef([])
  const isCollectingRef = useRef(false)

  const vad = useMicVAD({
    // VAD configuration
    startOnLoad: false,
    
    // Called when speech starts
    onSpeechStart: () => {
      console.log('🎤 Speech detected - Starting recording')
      audioChunksRef.current = []
      isCollectingRef.current = true
      if (onSpeechStart) onSpeechStart()
    },
    
    // Called when speech ends
    onSpeechEnd: (audio) => {
      console.log('🔇 Speech ended - Processing audio')
      isCollectingRef.current = false
      
      if (audio && audio.length > 0) {
        // Convert Float32Array to WAV format
        const wavBlob = float32ToWav(audio, 16000)
        console.log('📦 Audio collected:', wavBlob.size, 'bytes')
        
        if (onAudioData) {
          onAudioData(wavBlob)
        }
      }
      
      if (onSpeechEnd) onSpeechEnd()
    },
    
    // VAD model configuration
    positiveSpeechThreshold: 0.8,
    negativeSpeechThreshold: 0.75,
    minSpeechFrames: 3,
    redemptionFrames: 8,
    
    // Audio settings
    workletURL: '/vad.worklet.bundle.min.js',
    modelURL: '/silero_vad.onnx',
  })

  return vad
}

/**
 * Convert Float32Array audio to WAV blob
 */
function float32ToWav(float32Array, sampleRate) {
  // Convert float32 to int16
  const int16Array = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }

  // Create WAV file
  const buffer = new ArrayBuffer(44 + int16Array.length * 2)
  const view = new DataView(buffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + int16Array.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(view, 36, 'data')
  view.setUint32(40, int16Array.length * 2, true)

  // Write audio data
  const offset = 44
  for (let i = 0; i < int16Array.length; i++) {
    view.setInt16(offset + i * 2, int16Array[i], true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
