/**
 * VoiceBar Component - Call Transcript Style
 * Professional call transcript interface with chat-like design
 * Shows conversation history with timestamps and call status
 */

import React from 'react';
import './VoiceBar.css';

const VoiceBar = ({
  isActive,
  status,
  transcript,
  partialTranscript,
  aiResponse,
  conversationLog,
  metrics,
  onClose
}) => {
  // Get status display info
  const getStatusInfo = () => {
    switch (status) {
      case 'idle':
        return { icon: '⏸️', text: 'Idle', color: '#666', bgColor: 'rgba(102, 102, 102, 0.1)' };
      case 'ready':
        return { icon: '✅', text: 'Ready', color: '#54f5c4', bgColor: 'rgba(84, 245, 196, 0.1)' };
      case 'recording':
        return { icon: '🎙️', text: 'Recording...', color: '#54f5c4', bgColor: 'rgba(84, 245, 196, 0.1)', animate: true };
      case 'transcribing':
        return { icon: '📝', text: 'Transcribing...', color: '#ff9500', bgColor: 'rgba(255, 149, 0, 0.1)', animate: true };
      case 'thinking':
        return { icon: '🧠', text: 'Thinking...', color: '#ff9500', bgColor: 'rgba(255, 149, 0, 0.1)', animate: true };
      case 'speaking':
        return { icon: '🗣️', text: 'Speaking...', color: '#007AFF', bgColor: 'rgba(0, 122, 255, 0.1)', animate: true };
      case 'error':
        return { icon: '❌', text: 'Error', color: '#ff3b30', bgColor: 'rgba(255, 59, 48, 0.1)' };
      default:
        return { icon: '⏸️', text: 'Unknown', color: '#666', bgColor: 'rgba(102, 102, 102, 0.1)' };
    }
  };

  const statusInfo = getStatusInfo();

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Calculate call duration
  const getCallDuration = () => {
    if (conversationLog.length === 0) return '00:00';
    const firstMessage = new Date(conversationLog[0].timestamp);
    const now = new Date();
    const duration = Math.floor((now - firstMessage) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Format latency
  const formatLatency = (ms) => {
    if (!ms || ms === 0) return '-';
    return `${ms}ms`;
  };

  if (!isActive) return null;

  return (
    <div className="call-transcript-overlay">
      <div className="call-transcript-container">
        {/* Header */}
        <div className="call-transcript-header">
          <h2 className="call-transcript-title">Call Transcript</h2>
          <button className="call-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Messages Container */}
        <div className="call-messages-container">
          {conversationLog.length === 0 ? (
            <div className="call-empty-state">
              <div className="empty-icon">🎙️</div>
              <p className="empty-text">Waiting for conversation to start...</p>
              <p className="empty-subtext">Start speaking to begin the call</p>
            </div>
          ) : (
            <>
              {conversationLog.map((msg, index) => (
                <div key={index} className={`call-message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}>
                  <div className="message-header">
                    <span className="message-sender">
                      {msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'}
                    </span>
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="message-text">{msg.message}</div>
                </div>
              ))}
              
              {/* Show current transcription in progress */}
              {(partialTranscript || (transcript && status === 'transcribing')) && (
                <div className="call-message user-message partial">
                  <div className="message-header">
                    <span className="message-sender">User</span>
                    <span className="message-time">Now</span>
                  </div>
                  <div className="message-text">{partialTranscript || transcript}</div>
                </div>
              )}
              
              {/* Show AI response in progress */}
              {aiResponse && status === 'thinking' && (
                <div className="call-message assistant-message partial">
                  <div className="message-header">
                    <span className="message-sender">Assistant</span>
                    <span className="message-time">Now</span>
                  </div>
                  <div className="message-text">{aiResponse}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Status and Actions */}
        <div className="call-transcript-footer">
          <div className="call-status-bar">
            <div 
              className={`call-status-badge ${statusInfo.animate ? 'pulse' : ''}`}
              style={{ 
                backgroundColor: statusInfo.bgColor,
                borderColor: statusInfo.color 
              }}
            >
              <span className="status-indicator-dot" style={{ backgroundColor: statusInfo.color }}></span>
              <span className="status-text" style={{ color: statusInfo.color }}>
                {statusInfo.text}
              </span>
            </div>
            
            {metrics.totalLatency > 0 && (
              <div className="call-latency-badge">
                <span className="latency-icon">⚡</span>
                <span className="latency-text">{formatLatency(metrics.totalLatency)}</span>
              </div>
            )}
          </div>
          
          <div className="call-actions">
            <button className="call-action-btn view-logs-btn" onClick={() => console.log('View full logs')}>
              View call logs
            </button>
            <button className="call-action-btn end-call-btn" onClick={onClose}>
              <span className="end-call-icon">📞</span>
              End Call
            </button>
          </div>
        </div>

        {/* Call Duration Badge */}
        {conversationLog.length > 0 && (
          <div className="call-duration-badge">
            <span className="duration-icon">⏱️</span>
            <span className="duration-text">{getCallDuration()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceBar;

