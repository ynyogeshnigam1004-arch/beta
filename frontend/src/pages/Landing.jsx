import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, ArrowRight, Play,
  Settings, Phone, Brain, Repeat, BarChart3, Zap, Cpu, GitBranch,
  DollarSign, Wallet, CreditCard, TrendingUp, Bot, User
} from 'lucide-react';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [callTimer, setCallTimer] = useState(42);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    // Mouse position tracking for gradient effect
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Scroll reveal animation with stagger
    const revealEls = document.querySelectorAll('.sr');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { 
        if (e.isIntersecting) { 
          e.target.classList.add('in'); 
        } 
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    revealEls.forEach(el => observer.observe(el));

    // Latency bar animation
    const latBars = document.querySelectorAll('.lat-bar');
    const latSection = document.getElementById('lat-section');
    let latFired = false;
    
    const latObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !latFired) {
        latFired = true;
        latBars.forEach(bar => {
          bar.style.width = bar.dataset.w;
        });
      }
    }, { threshold: 0.4 });
    
    if (latSection) latObs.observe(latSection);

    // Stats counter animation
    const statsSection = document.getElementById('stats');
    let statsFired = false;
    
    const statsObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !statsFired) {
        statsFired = true;
        const statNums = document.querySelectorAll('.stat-num');
        statNums.forEach(num => {
          num.style.animation = 'countUp 1s ease-out forwards';
        });
      }
    }, { threshold: 0.3 });
    
    if (statsSection) statsObs.observe(statsSection);

    // Hero typing animation
    const heroTypeTarget = document.getElementById('hero-type-target');
    const heroReply = "Perfect! I've locked in your service appointment for tomorrow at 9 AM, Arjun. You'll receive an SMS confirmation shortly. Is there anything else I can help you with?";
    let charIdx = 0;
    
    const typeHeroReply = () => {
      if (charIdx === 0) heroTypeTarget.innerHTML = '';
      if (charIdx < heroReply.length) {
        heroTypeTarget.textContent = heroReply.slice(0, ++charIdx);
        setTimeout(typeHeroReply, 28);
      }
    };
    
    setTimeout(typeHeroReply, 3000);

    // Call timer
    const timerInterval = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      revealEls.forEach(el => observer.unobserve(el));
      if (latSection) latObs.unobserve(latSection);
      if (statsSection) statsObs.unobserve(statsSection);
      clearInterval(timerInterval);
    };
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="landing-page">
      {/* Background Effects */}
      <div className="bg-grid"></div>
      <div className="aurora">
        <div className="aurora-blob a"></div>
        <div className="aurora-blob b"></div>
        <div className="aurora-blob c"></div>
      </div>

      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-logo">
          vagle<span>.</span>
        </div>
        <ul className="nav-links">
          <li><a href="#how">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#usecases">Industries</a></li>
          <li><a href="#pricing">Pricing</a></li>
        </ul>
        <div className="nav-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="nav-cta">
              Go to Dashboard
              <motion.span
                initial={{ x: 0 }}
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
              >
                <ArrowRight size={16} />
              </motion.span>
            </Link>
          ) : (
            <>
              <Link to="/login" className="nav-login">Log in</Link>
              <Link to="/signup" className="nav-cta">
                Start Free
                <motion.span
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowRight size={16} />
                </motion.span>
              </Link>
            </>
          )}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {mobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={24} />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <a href="#how" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#usecases" onClick={() => setMobileMenuOpen(false)}>Industries</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section id="hero" className="hero z1">
        <div className="container hero-container">
          <div className="hero-eyebrow">
            <span>Introducing</span>
            <span className="badge">Vagle Voice AI — v2.0</span>
            <span>🎉 Now with multi-LLM routing</span>
          </div>
          
          <h1 className="hero-h1">
            Enterprise-Grade AI Voice Agents<br/>
            <span className="grad">For Modern Businesses</span>
          </h1>
          
          <p className="hero-sub">
            Deploy intelligent voice agents that handle customer interactions 24/7 with human-like conversations. 
            Automate lead qualification, appointment scheduling, and seamless handoffs to your team—all powered by 
            enterprise AI infrastructure with sub-600ms response times.
          </p>
          
          <div className="hero-ctas">
            <motion.button 
              onClick={handleGetStarted} 
              className="btn-primary"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              animate={{ 
                boxShadow: [
                  '0 4px 32px rgba(84, 245, 196, 0.3)',
                  '0 4px 32px rgba(84, 245, 196, 0.5)',
                  '0 4px 32px rgba(84, 245, 196, 0.3)'
                ]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight size={16} />
              </motion.span>
            </motion.button>
            <motion.a 
              href="#how" 
              className="btn-ghost"
              whileHover={{ scale: 1.02, borderColor: 'rgba(84, 245, 196, 0.5)' }}
              whileTap={{ scale: 0.98 }}
            >
              <Play size={16} />
              View Demo
            </motion.a>
          </div>
          
          <p className="hero-note">
            <span>✓</span> No credit card required &nbsp;·&nbsp; 
            <span>✓</span> 50 complimentary calls &nbsp;·&nbsp; 
            <span>✓</span> Deploy in 20 minutes
          </p>

          {/* Live Call Card */}
          <div className="hero-card-wrap sr">
            <motion.div 
              className="hero-card"
              style={{
                background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(84, 245, 196, 0.08), rgba(11,11,26,0.85) 50%)`
              }}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              {/* Browser Chrome */}
              <div className="browser-bar">
                <div className="browser-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="browser-url">
                  app.vagle.in/dashboard/live-calls
                </div>
              </div>

              {/* Live Call Row */}
              <div className="live-call-row">
                <div className="agent-avatar">
                  <Bot size={24} strokeWidth={2} />
                </div>
                <div className="call-meta">
                  <div className="cn">Vagle Agent · Raj's Auto Repair</div>
                  <div className="cs">Live Call · {formatTime(callTimer)}</div>
                </div>
                <div className="waveform">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="wb"></div>
                  ))}
                </div>
                <div className="call-timer">{formatTime(callTimer)}</div>
              </div>

              {/* Transcript */}
              <div className="transcript">
                <div className="msg">
                  <span className="msg-tag user">Caller</span>
                  <span className="msg-text">"Hi, I need to book a car service for tomorrow morning — is 9 AM available?"</span>
                </div>
                <div className="msg">
                  <span className="msg-tag ai">Vagle AI</span>
                  <span className="msg-text">"Absolutely! 9 AM is open. May I get your name and vehicle model to lock that in?"</span>
                </div>
                <div className="msg">
                  <span className="msg-tag user">Caller</span>
                  <span className="msg-text">"Arjun Mehta, Honda City 2022."</span>
                </div>
                <div className="msg">
                  <span className="msg-tag ai">Vagle AI</span>
                  <span className="msg-text" id="hero-type-target">
                    <span className="typing-indicator">
                      <span className="td"></span>
                      <span className="td"></span>
                      <span className="td"></span>
                    </span>
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="metrics-row">
                <div className="metric-box">
                  <div className="mv">&lt;600ms</div>
                  <div className="ml">Response Latency</div>
                </div>
                <div className="metric-box">
                  <div className="mv">97.4%</div>
                  <div className="ml">Intent Accuracy</div>
                </div>
                <div className="metric-box">
                  <div className="mv">₹0.08</div>
                  <div className="ml">Cost This Call</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Logo Strip */}
      <div id="logos" className="z1">
        <div className="container">
          <p className="logos-label">Powered by the world's best AI infrastructure</p>
          <div className="logos-scroll">
            <div className="logos-track">
              {[...Array(2)].map((_, idx) => (
                <React.Fragment key={idx}>
                  <span className="logo-item">🎙️ OpenAI Whisper</span>
                  <span className="logo-item">🌊 Deepgram</span>
                  <span className="logo-item">🔮 GPT-4o</span>
                  <span className="logo-item">💎 Gemini 2.0</span>
                  <span className="logo-item">🎵 ElevenLabs</span>
                  <span className="logo-item">🎤 PlayHT</span>
                  <span className="logo-item">🤗 AssemblyAI</span>
                  <span className="logo-item">🧠 Claude 3.5</span>
                  <span className="logo-item">💳 Razorpay</span>
                  <span className="logo-item">💜 Stripe</span>
                  <span className="logo-item">📱 Twilio</span>
                  <span className="logo-item">⚡ Deepgram Aura</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <section id="stats">
        <div className="container">
          <div className="stats-grid sr">
            <div className="stat-cell">
              <div className="stat-num">24<span className="stat-unit">/7</span></div>
              <div className="stat-label">Always answering</div>
            </div>
            <div className="stat-cell">
              <div className="stat-num">&lt;600<span className="stat-unit">ms</span></div>
              <div className="stat-label">Pipeline latency</div>
            </div>
            <div className="stat-cell">
              <div className="stat-num">40<span className="stat-unit">+</span></div>
              <div className="stat-label">Industries served</div>
            </div>
            <div className="stat-cell">
              <div className="stat-num">3<span className="stat-unit">×</span></div>
              <div className="stat-label">More deals closed</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how">
        <div className="container">
          <div className="section-header center sr">
            <div className="pill">
              <span className="pill-dot"></span>
              Process
            </div>
            <h2 className="section-title">
              From Ring to <span className="accent">Revenue</span>
            </h2>
            <p className="section-sub">Your Vagle agent goes live in minutes, not months.</p>
          </div>
          
          <div className="how-grid">
            {[
              { num: '1', Icon: Settings, title: 'Configure Agent', desc: 'Define business logic, conversation flows, and knowledge base through intuitive interface.' },
              { num: '2', Icon: Phone, title: 'Connect Infrastructure', desc: 'Integrate your phone system with enterprise-grade telephony infrastructure.' },
              { num: '3', Icon: Brain, title: 'AI Processing', desc: 'Real-time speech recognition, natural language understanding, and voice synthesis.' },
              { num: '4', Icon: Repeat, title: 'Intelligent Handoff', desc: 'Context-aware transfer to human agents with complete conversation history.' },
              { num: '5', Icon: BarChart3, title: 'Analytics & Optimization', desc: 'Comprehensive performance metrics, cost analysis, and conversion tracking.' }
            ].map((step, i) => (
              <motion.div 
                key={i} 
                className={`how-step sr sr-delay-${i + 1}`}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="how-step-icon">
                  <span className="how-step-num">{step.num}</span>
                  <step.Icon size={28} strokeWidth={1.5} />
                </div>
                <div className="how-step-title">{step.title}</div>
                <div className="how-step-desc">{step.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features">
        <div className="container">
          <div className="section-header sr">
            <div className="pill">
              <span className="pill-dot"></span>
              Features
            </div>
            <h2 className="section-title">
              Everything Your Business <span className="accent">Needs</span>
            </h2>
            <p className="section-sub">
              A complete platform — from the call pipeline all the way to payments and billing.
            </p>
          </div>

          <div className="bento">
            {/* Latency Tracing */}
            <motion.div 
              className="bc bc-7 sr"
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="bc-icon">
                <Zap size={32} strokeWidth={1.5} />
              </div>
              <div className="bc-title">Enterprise-Grade Voice Pipeline</div>
              <div className="bc-desc">
                Production-ready speech-to-text, natural language processing, and text-to-speech pipeline 
                delivering sub-600ms response times. Monitor and optimize each component independently.
              </div>
              <div className="lat-section" id="lat-section">
                <div className="lat-row">
                  <span className="lat-name">STT</span>
                  <div className="lat-track">
                    <div className="lat-bar stt" data-w="52%"></div>
                  </div>
                  <span className="lat-val">~140ms</span>
                </div>
                <div className="lat-row">
                  <span className="lat-name">LLM</span>
                  <div className="lat-track">
                    <div className="lat-bar llm" data-w="75%"></div>
                  </div>
                  <span className="lat-val">~290ms</span>
                </div>
                <div className="lat-row">
                  <span className="lat-name">TTS</span>
                  <div className="lat-track">
                    <div className="lat-bar tts" data-w="44%"></div>
                  </div>
                  <span className="lat-val">~110ms</span>
                </div>
              </div>
            </motion.div>

            {/* AI Stack */}
            <motion.div 
              className="bc bc-5 sr sr-delay-1"
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="bc-icon">
                <Cpu size={32} strokeWidth={1.5} />
              </div>
              <div className="bc-title">Flexible AI Infrastructure</div>
              <div className="bc-desc">
                Choose from leading AI providers for speech recognition, language models, and voice synthesis. 
                Optimize for your specific cost and performance requirements.
              </div>
              <div className="tech-pills">
                <span className="tp purple">GPT-4o</span>
                <span className="tp purple">Gemini 2.0</span>
                <span className="tp purple">Claude 3.5</span>
                <span className="tp">Whisper</span>
                <span className="tp">Deepgram</span>
                <span className="tp">AssemblyAI</span>
                <span className="tp green">ElevenLabs</span>
                <span className="tp green">PlayHT</span>
                <span className="tp green">Deepgram Aura</span>
              </div>
            </motion.div>

            {/* Warm Transfer */}
            <motion.div 
              className="bc bc-4 sr"
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="bc-icon">
                <GitBranch size={32} strokeWidth={1.5} />
              </div>
              <div className="bc-title">Intelligent Call Routing</div>
              <div className="bc-desc">
                Seamless handoff to human agents with complete conversation context, customer intent analysis, 
                and qualification status.
              </div>
              <div className="transfer-vis">
                <div className="tv-node">
                  <div className="ni">
                    <Bot size={24} strokeWidth={1.5} />
                  </div>
                  <div className="nl">AI Agent</div>
                </div>
                <div className="tv-arr">
                  <ArrowRight size={24} strokeWidth={2} />
                </div>
                <div className="tv-node">
                  <div className="ni">
                    <User size={24} strokeWidth={1.5} />
                  </div>
                  <div className="nl">Your Team</div>
                </div>
              </div>
            </motion.div>

            {/* Cost Breakdown */}
            <motion.div 
              className="bc bc-4 sr sr-delay-1"
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="bc-icon">
                <DollarSign size={32} strokeWidth={1.5} />
              </div>
              <div className="bc-title">Transparent Cost Analytics</div>
              <div className="bc-desc">
                Detailed per-call cost breakdown across all AI services. Real-time budget tracking with predictable pricing.
              </div>
              <div className="cost-rows">
                <div className="cost-row">
                  <span className="label">STT (Deepgram)</span>
                  <span className="amount">₹0.018</span>
                </div>
                <div className="cost-row">
                  <span className="label">LLM (GPT-4o)</span>
                  <span className="amount">₹0.047</span>
                </div>
                <div className="cost-row">
                  <span className="label">TTS (ElevenLabs)</span>
                  <span className="amount">₹0.021</span>
                </div>
                <div className="cost-divider"></div>
                <div className="cost-row">
                  <span className="label total-label">Total</span>
                  <span className="amount total">₹0.086</span>
                </div>
              </div>
            </motion.div>

            {/* Balance Tracking */}
            <motion.div 
              className="bc bc-4 sr sr-delay-2"
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="bc-icon">
                <Wallet size={32} strokeWidth={1.5} />
              </div>
              <div className="bc-title">Credit Management</div>
              <div className="bc-desc">
                Real-time balance monitoring with automated recharge alerts. Ensure uninterrupted service with 
                intelligent threshold notifications.
              </div>
              <div className="balance-wrap">
                <div className="balance-num">₹4,820</div>
                <div className="balance-sub">68% remaining · ~1,140 calls left</div>
                <div className="balance-bar-wrap">
                  <div className="balance-bar-track">
                    <div className="balance-bar-fill"></div>
                  </div>
                  <div className="balance-labels">
                    <span>₹0</span>
                    <span>₹7,100 recharge</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Payments */}
            <motion.div 
              className="bc bc-6 sr"
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="bc-icon">
                <CreditCard size={32} strokeWidth={1.5} />
              </div>
              <div className="bc-title">Global Payment Infrastructure</div>
              <div className="bc-desc">
                Accept payments via Razorpay (India) and Stripe (International). Support for UPI, cards, 
                net banking, and 150+ currencies.
              </div>
              <div className="pay-logos">
                <div className="pay-logo razorpay">💳 Razorpay</div>
                <div className="pay-logo stripe">💜 Stripe</div>
                <div className="pay-logo upi">📱 UPI</div>
                <div className="pay-logo intl">🌍 150+ Countries</div>
              </div>
            </motion.div>

            {/* Analytics */}
            <motion.div 
              className="bc bc-6 sr sr-delay-1"
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="bc-icon">
                <TrendingUp size={32} strokeWidth={1.5} />
              </div>
              <div className="bc-title">Business Intelligence Platform</div>
              <div className="bc-desc">
                Comprehensive analytics including call recordings, transcripts, sentiment analysis, conversion metrics, 
                performance tracking, and cost optimization insights.
              </div>
              <div className="chart-mini">
                {[40, 65, 50, 80, 60, 90, 100].map((height, i) => (
                  <div key={i} className={`chart-bar v${i + 1}`} style={{ height: `${height}%` }}></div>
                ))}
              </div>
              <div className="chart-labels">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <span key={i}>{day}</span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta">
        <div className="cta-glow"></div>
        <div className="container z1 cta-container">
          <div className="pill">
            <span className="pill-dot"></span>
            Get Started Today
          </div>
          <h2 className="section-title sr">
            Your Business Deserves an AI<br/>
            <span className="accent">That Never Sleeps</span>
          </h2>
          <p className="section-sub sr">
            Deploy your first Vagle voice agent in under 20 minutes. No code, no contracts, no risk.
          </p>
          <div className="cta-btns sr">
            <motion.button 
              onClick={handleGetStarted} 
              className="btn-primary"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
            </motion.button>
            <motion.a 
              href="mailto:hello@vagle.in" 
              className="btn-ghost"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Contact Sales
            </motion.a>
          </div>
          <p className="cta-fine sr">
            <span>✓</span> No credit card required &nbsp;·&nbsp; 
            <span>✓</span> 50 complimentary calls &nbsp;·&nbsp; 
            <span>✓</span> Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer z1">
        <div className="container">
          <div className="footer-top">
            <div>
              <div className="footer-brand-logo">vagle.</div>
              <p className="footer-tagline">
                AI Voice Agents that handle customer calls, qualify leads, close deals, and transfer to your team — 
                24/7, across any service industry.
              </p>
              <div className="footer-socials">
                <a href="#" className="social-btn">𝕏</a>
                <a href="#" className="social-btn">in</a>
                <a href="#" className="social-btn">gh</a>
                <a href="#" className="social-btn">ig</a>
              </div>
            </div>
            <div className="footer-col">
              <h5>Product</h5>
              <a href="#how">How it Works</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <Link to="/dashboard">Dashboard</Link>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
              <a href="mailto:hello@vagle.in">Contact</a>
            </div>
            <div className="footer-col">
              <h5>Legal</h5>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Refund Policy</a>
              <a href="#">Security</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Vagle Technologies Pvt. Ltd. · vagle.in</span>
            <span>Made with ❤️ in India</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
