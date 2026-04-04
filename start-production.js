#!/usr/bin/env node

/**
 * Production Voice AI Platform Startup Script
 * Handles server management, auto-restart, and error recovery
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProductionManager {
  constructor() {
    this.backendProcess = null;
    this.frontendProcess = null;
    this.restartCount = 0;
    this.maxRestarts = 10;
    this.restartDelay = 5000; // 5 seconds
    this.shuttingDown = false;
    this.isRestarting = false; // Prevent duplicate restarts
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
    process.on('uncaughtException', (error) => this.handleError(error));
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }

  async killProcessOnPort(port) {
    return new Promise((resolve) => {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (stdout) {
          const lines = stdout.split('\n');
          const pids = new Set();
          
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
              const pid = parts[4];
              if (pid && pid !== '0') {
                pids.add(pid);
              }
            }
          }
          
          if (pids.size > 0) {
            const pidArray = Array.from(pids);
            this.log(`Found ${pidArray.length} process(es) on port ${port}: ${pidArray.join(', ')}`);
            
            pidArray.forEach(pid => {
              exec(`taskkill /f /pid ${pid}`, (err) => {
                if (!err) {
                  this.log(`Killed process ${pid} on port ${port}`);
                }
              });
            });
            
            // Wait longer for processes to be killed
            setTimeout(resolve, 3000);
          } else {
            resolve();
          }
        } else {
          resolve();
        }
      });
    });
  }

  async startBackend() {
    this.log('Starting Backend Server...');
    
    // Kill any existing process on port 5001
    await this.killProcessOnPort(5001);
    
    return new Promise((resolve, reject) => {
      const backendPath = path.join(__dirname, 'backend');
      
      this.backendProcess = spawn('node', ['server.js'], {
        cwd: backendPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running on port 5001')) {
          this.log('Backend Server started successfully', 'success');
          resolve();
        }
      });

      this.backendProcess.stderr.on('data', (data) => {
        this.log(`Backend Error: ${data.toString()}`, 'error');
      });

      this.backendProcess.on('error', (error) => {
        this.log(`Failed to start backend: ${error.message}`, 'error');
        reject(error);
      });

      this.backendProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          this.log(`Backend process exited with code ${code}`, 'error');
          // Only restart if not manually killed and not already restarting
          if (!this.shuttingDown && !this.isRestarting) {
            this.handleBackendCrash();
          }
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.backendProcess.killed) {
          resolve();
        }
      }, 10000);
    });
  }

  async startFrontend() {
    this.log('Starting Frontend Server...');
    
    // Kill any existing process on port 3000
    await this.killProcessOnPort(3000);
    
    return new Promise((resolve, reject) => {
      const frontendPath = path.join(__dirname, 'frontend');
      
      this.frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: frontendPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      this.frontendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Local:') && output.includes('3000')) {
          this.log('Frontend Server started successfully', 'success');
          resolve();
        }
      });

      this.frontendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('proxy error')) { // Ignore proxy errors
          this.log(`Frontend Error: ${error}`, 'error');
        }
      });

      this.frontendProcess.on('error', (error) => {
        this.log(`Failed to start frontend: ${error.message}`, 'error');
        reject(error);
      });

      this.frontendProcess.on('exit', (code) => {
        if (code !== 0) {
          this.log(`Frontend process exited with code ${code}`, 'error');
          this.handleFrontendCrash();
        }
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!this.frontendProcess.killed) {
          resolve();
        }
      }, 15000);
    });
  }

  handleBackendCrash() {
    // Prevent duplicate restart attempts
    if (this.isRestarting) {
      this.log('Restart already in progress, skipping...', 'warning');
      return;
    }
    
    this.isRestarting = true;
    this.log('Backend crashed, attempting restart...', 'warning');
    this.restartCount++;
    
    if (this.restartCount < this.maxRestarts) {
      // Kill any process on port before restarting
      this.killProcessOnPort(5001).then(() => {
        setTimeout(() => {
          this.startBackend()
            .then(() => {
              this.isRestarting = false;
            })
            .catch(error => {
              this.log(`Failed to restart backend: ${error.message}`, 'error');
              this.isRestarting = false;
            });
        }, this.restartDelay);
      });
    } else {
      this.log('Maximum restart attempts reached for backend', 'error');
      this.isRestarting = false;
    }
  }

  handleFrontendCrash() {
    this.log('Frontend crashed, attempting restart...', 'warning');
    setTimeout(() => {
      this.startFrontend().catch(error => {
        this.log(`Failed to restart frontend: ${error.message}`, 'error');
      });
    }, this.restartDelay);
  }

  handleError(error) {
    this.log(`Uncaught exception: ${error.message}`, 'error');
    this.shutdown();
  }

  async shutdown() {
    this.shuttingDown = true;
    this.log('Shutting down servers...', 'warning');
    
    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
    }
    
    if (this.frontendProcess) {
      this.frontendProcess.kill('SIGTERM');
    }
    
    // Force kill after 5 seconds
    setTimeout(() => {
      exec('taskkill /f /im node.exe', () => {
        this.log('All processes terminated', 'success');
        process.exit(0);
      });
    }, 5000);
  }

  async start() {
    try {
      this.log('🚀 Starting Voice AI Platform in Production Mode...', 'success');
      
      // Check if ports are available
      const backendPortFree = await this.checkPort(5001);
      const frontendPortFree = await this.checkPort(3000);
      
      if (!backendPortFree) {
        this.log('Port 5001 is in use, killing existing processes...', 'warning');
        await this.killProcessOnPort(5001);
      }
      
      if (!frontendPortFree) {
        this.log('Port 3000 is in use, killing existing processes...', 'warning');
        await this.killProcessOnPort(3000);
      }
      
      // Start servers
      await this.startBackend();
      await this.startFrontend();
      
      this.log('🎉 Voice AI Platform is running!', 'success');
      this.log('📱 Frontend: http://localhost:3000', 'info');
      this.log('🔧 Backend: http://localhost:5001', 'info');
      this.log('🏥 Health Check: http://localhost:5001/health', 'info');
      this.log('Press Ctrl+C to stop all servers', 'info');
      
      // Keep the process alive
      setInterval(() => {
        // Health check every 30 seconds
        if (!this.isRestarting) {
          this.checkPort(5001).then(backendUp => {
            if (!backendUp && this.backendProcess && !this.backendProcess.killed && !this.isRestarting) {
              this.log('Backend health check failed, restarting...', 'warning');
              this.handleBackendCrash();
            }
          });
        }
      }, 30000);
      
    } catch (error) {
      this.log(`Failed to start platform: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Start the production manager
const manager = new ProductionManager();
manager.start();
