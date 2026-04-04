import { Link } from "react-router-dom";
import LightbulbButton from "../components/LightbulbButton";

export default function Home() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&family=Syne:wght@400;500;600;700;800&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html, body, #root {
          height: 100%;
          width: 100%;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background-color: #0d0d0d;
          color: #f8fafc;
          overflow-x: hidden;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        /* Hide scrollbar for Chrome, Safari and Opera */
        *::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .container {
          min-height: 100vh;
          width: 100vw;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          background: #0a0a0a;
          position: relative;
          overflow-x: hidden;
        }
        
        /* Animated Background Wallpaper */
        .container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            linear-gradient(180deg, 
              rgba(13, 13, 13, 0.95) 0%, 
              rgba(26, 26, 26, 0.9) 50%,
              rgba(13, 13, 13, 0.95) 100%
            );
          z-index: 0;
          pointer-events: none;
        }
        
        .container::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            repeating-linear-gradient(
              0deg,
              rgba(255, 153, 0, 0.03) 0px,
              transparent 1px,
              transparent 40px,
              rgba(255, 153, 0, 0.03) 41px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(255, 153, 0, 0.03) 0px,
              transparent 1px,
              transparent 40px,
              rgba(255, 153, 0, 0.03) 41px
            ),
            radial-gradient(
              circle at 20% 30%, 
              rgba(255, 102, 0, 0.1) 0%, 
              transparent 50%
            ),
            radial-gradient(
              circle at 80% 70%, 
              rgba(255, 153, 0, 0.08) 0%, 
              transparent 50%
            ),
            radial-gradient(
              circle at 40% 80%, 
              rgba(255, 179, 57, 0.06) 0%, 
              transparent 40%
            );
          z-index: 0;
          pointer-events: none;
          animation: backgroundPulse 20s ease-in-out infinite;
        }
        
        @keyframes backgroundPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -30px) scale(1.05); }
        }
        
        /* Background Overlay Elements */
        .bg-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        
        /* Animated Grid */
        .bg-grid {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image: 
            linear-gradient(rgba(255, 153, 0, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 153, 0, 0.02) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 30s linear infinite;
          transform: perspective(500px) rotateX(60deg);
        }
        
        @keyframes gridMove {
          0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
          100% { transform: perspective(500px) rotateX(60deg) translateY(50px); }
        }
        
        /* Floating Orbs */
        .bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          animation: floatOrb 20s ease-in-out infinite;
        }
        
        .bg-orb-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(255, 102, 0, 0.3) 0%, transparent 70%);
          top: -200px;
          right: -100px;
          animation-duration: 25s;
        }
        
        .bg-orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(255, 153, 0, 0.25) 0%, transparent 70%);
          bottom: -150px;
          left: -100px;
          animation-duration: 30s;
          animation-delay: -5s;
        }
        
        .bg-orb-3 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255, 179, 57, 0.2) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          animation-duration: 35s;
          animation-delay: -10s;
        }
        
        @keyframes floatOrb {
          0%, 100% { 
            transform: translate(0, 0) scale(1);
            opacity: 0.4;
          }
          33% { 
            transform: translate(50px, -50px) scale(1.1);
            opacity: 0.5;
          }
          66% { 
            transform: translate(-30px, 40px) scale(0.9);
            opacity: 0.3;
          }
        }
        
        /* Particles */
        .bg-particles {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        
        .particle {
          position: absolute;
          width: 3px;
          height: 3px;
          background: rgba(255, 153, 0, 0.6);
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(255, 153, 0, 0.8);
          animation: particleFloat 20s linear infinite;
        }
        
        @keyframes particleFloat {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(50px);
            opacity: 0;
          }
        }
        
        /* Animated Lines */
        .bg-lines {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        
        .line {
          position: absolute;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 153, 0, 0.4) 50%,
            transparent 100%
          );
          animation: lineMove 15s ease-in-out infinite;
        }
        
        .line-1 {
          width: 400px;
          top: 20%;
          left: -400px;
          animation-duration: 18s;
        }
        
        .line-2 {
          width: 500px;
          top: 50%;
          right: -500px;
          animation-duration: 22s;
          animation-delay: -5s;
          animation-direction: reverse;
        }
        
        .line-3 {
          width: 350px;
          top: 75%;
          left: -350px;
          animation-duration: 20s;
          animation-delay: -10s;
        }
        
        @keyframes lineMove {
          0% {
            transform: translateX(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateX(calc(100vw + 100%));
            opacity: 0;
          }
        }
        
        nav.navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: clamp(20px, 3vh, 28px) clamp(24px, 5vw, 64px);
          border-bottom: 1px solid #2a2a2c;
          background-color: rgba(18, 18, 18, 0.95);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
          max-width: 100%;
        }
        .logo {
          font-size: clamp(1.6rem, 3vw, 2.4rem);
          font-weight: 700;
          font-family: 'Poppins', 'Inter', sans-serif;
          background: linear-gradient(120deg, #ff9900 0%, #ff7700 40%, #ff6600 60%, #ff8800 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          animation: logoGlow 4s ease-in-out infinite;
        }
        .logo:hover {
          transform: scale(1.03) translateY(-1px);
          letter-spacing: 0.08em;
        }
        @keyframes logoGlow {
          0%, 100% { 
            background-position: 0% 50%;
            filter: drop-shadow(0 0 10px rgba(255, 153, 0, 0.3));
          }
          50% { 
            background-position: 100% 50%;
            filter: drop-shadow(0 0 18px rgba(255, 153, 0, 0.5));
          }
        }
        ul.nav-links {
          list-style: none;
          display: flex;
          gap: clamp(16px, 3vw, 32px);
        }
        ul.nav-links li a {
          color: #f8fafc;
          text-decoration: none;
          font-weight: 600;
          font-size: clamp(0.85rem, 1.5vw, 0.95rem);
          font-family: 'Inter', sans-serif;
          opacity: 0.8;
          transition: all 0.3s ease;
          position: relative;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        ul.nav-links li a::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(to right, #ff6600, #ff9900);
          transition: width 0.3s ease;
        }
        ul.nav-links li a:hover {
          opacity: 1;
        }
        ul.nav-links li a:hover::after {
          width: 100%;
        }
        /* Navbar Dashboard Button Styles */
        .nav-button-container {
          position: relative;
          background: transparent;
          border-radius: 20px;
          box-shadow:
            4px 4px 8px rgba(0, 0, 0, 0.6),
            -4px -4px 8px rgba(255, 255, 255, 0.01),
            inset 1px 1px 3px rgba(255, 255, 255, 0.08),
            inset -1px -1px 3px rgba(0, 0, 0, 0.5);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          height: 50px;
          width: 190px;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: visible;
        }

        .nav-button-container::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, transparent, rgba(0, 0, 0, 0.15), transparent);
          background-size: 200% 200%;
          animation: shine 5s infinite ease-in-out;
          border-radius: 20px;
        }

        .nav-button-container::after {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 40px;
          height: 35px;
          background: transparent;
          filter: blur(15px);
          border-radius: 0 0 0 50%;
          animation: glowPulse 5s infinite ease-in-out;
        }

        .nav-glow {
          position: relative;
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-button {
          width: 180px;
          height: 45px;
          cursor: pointer;
          border-radius: 30px;
          display: flex;
          background-color: transparent;
          border: none;
          font-family: 'Poppins', sans-serif;
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          position: relative;
          overflow: visible;
        }

        .nav-button:hover {
          transform: scale(1.02);
        }

        .nav-button:active {
          transform: scale(1);
          transition: transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-left, .nav-right {
          position: relative;
          transition: all 0.3s ease-in-out;
        }

        .nav-left {
          width: 30%;
          height: 100%;
          border-radius: 30px 4px 4px 30px;
          background-color: rgba(37, 37, 37, 0.251);
          box-shadow:
            -1px -10px 8px rgba(255, 255, 255, 0.104) inset,
            1px 1px 4px rgba(255, 255, 255, 0.103) inset;
        }

        .nav-left::before {
          content: "";
          position: absolute;
          top: 6px;
          right: 1px;
          width: 40px;
          height: 25px;
          background: linear-gradient(to right, rgb(54, 54, 54), rgba(255, 255, 255, 0.203));
          border-radius: 40px 4px 4px 40px;
          filter: blur(6px);
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-left::after {
          content: "";
          position: absolute;
          right: 1px;
          width: 2px;
          height: 100%;
          background: rgba(255, 255, 255, 0.468);
          filter: blur(1px);
          border-radius: 10px;
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-right {
          width: 70%;
          height: 100%;
          border-radius: 5px 30px 30px 5px;
          background-color: rgba(12, 12, 12, 0.357);
          text-align: center;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          padding: 0 12px 0 8px;
          border: 2px solid rgba(255, 255, 255, 0.461);
          border-bottom: 2px solid rgba(255, 255, 255, 0.283);
          border-left: 2px solid rgba(69, 69, 69, 0.502);
          box-shadow:
            1px 1px 15px rgba(255, 255, 252, 0.204) inset,
            -0px -3px 6px rgba(80, 80, 80, 0.614) inset;
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-right::before {
          content: "";
          position: absolute;
          left: 0;
          bottom: 10px;
          width: 90%;
          height: 8px;
          background: linear-gradient(to top, rgba(255, 255, 255, 0.226), rgba(255, 255, 255, 0.155), rgba(0, 0, 0, 0.323));
          border-radius: 0 0 50% 0;
          filter: blur(3px);
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-right::after {
          content: "";
          position: absolute;
          left: 0;
          width: 90%;
          height: 28px;
          top: 3px;
          background: linear-gradient(to bottom, rgba(205, 205, 205, 0.373), black);
          border-radius: 4px 30px 30px 4px;
          z-index: -2;
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-right .nav-filament {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-filament::before {
          content: "";
          position: absolute;
          width: 60px;
          height: 35px;
          left: 1px;
          top: -4px;
          z-index: -3;
          background: linear-gradient(to right, rgba(29, 29, 29, 0), rgba(60, 60, 60, 0), transparent);
          filter: blur(8px);
          border-radius: 0 30px 30px 0;
          opacity: 0;
          transition: opacity 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-button:hover .nav-filament::before {
          opacity: 1;
          background: linear-gradient(to right, rgb(255, 132, 0), rgba(255, 136, 0, 0.871), transparent, transparent);
          animation: filamentFlicker 1.5s infinite cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-filament .nav-icon {
          color: rgba(215, 215, 215, 0.9);
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          filter: drop-shadow(1px 1px 2px rgb(255, 140, 0));
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .nav-right .nav-title {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          font-family: 'Poppins', sans-serif;
          margin: 0;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.528);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .nav-button:hover .nav-filament .nav-icon {
          color: rgb(255, 216, 174);
          animation: iconGlow 1.5s infinite cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-button:hover .nav-title {
          color: rgb(255, 255, 255);
          text-shadow: 2px 2px 8px rgb(255, 120, 24);
          animation: textGlow 1.5s infinite cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .nav-button:hover .nav-left {
          transform: translateX(-3px) rotate(-2deg);
          transition: all 0.3s ease-in-out;
        }

        .nav-button:hover .nav-right {
          transform: translateX(3px) rotate(2deg);
          margin-top: 1px;
          box-shadow:
            1px 1px 20px rgba(255, 165, 0, 0.3) inset,
            -0px -3px 6px rgba(80, 80, 80, 0.614) inset;
          transition: all 0.3s ease-in-out;
        }

        .nav-button:active .nav-left {
          transform: translateX(0) rotate(0deg);
          transition: all 0.3s ease-in-out;
        }

        .nav-button:active .nav-right {
          transform: translateX(0) rotate(0deg);
          margin-top: 0px;
          transition: all 0.3s ease-in-out;
        }
        main.hero-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: clamp(40px, 8vh, 120px) clamp(20px, 5vw, 80px);
          text-align: center;
          min-height: calc(100vh - 180px);
          margin: 0 auto;
          max-width: 1400px;
          width: 100%;
          animation: fadeInUp 0.8s ease-out;
          position: relative;
          z-index: 10;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        h1.hero-title {
          font-size: clamp(3.5rem, 10vw, 7rem);
          font-weight: 800;
          font-family: 'Poppins', sans-serif;
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin-bottom: clamp(20px, 3vh, 32px);
          background: linear-gradient(135deg, #ff6600 0%, #ff9900 50%, #ffb347 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 4s ease-in-out infinite;
          transform: translateY(0);
          transition: all 0.4s ease;
          text-transform: uppercase;
          filter: drop-shadow(0 0 25px rgba(255, 153, 0, 0.4));
        }
        h1.hero-title:hover {
          transform: translateY(-8px) scale(1.02);
          filter: drop-shadow(0 0 40px rgba(255, 153, 0, 0.6));
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        p.hero-subtitle {
          font-size: clamp(1.05rem, 2.2vw, 1.35rem);
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          color: #d1d5db;
          max-width: min(700px, 90vw);
          margin: 0 auto clamp(32px, 5vh, 48px);
          line-height: 1.7;
          letter-spacing: 0.01em;
          opacity: 0.95;
        }
        .hero-buttons {
          display: flex;
          gap: clamp(16px, 3vw, 24px);
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 8px;
        }
        
        /* Lightbulb Button - Part 1 */
        .area{--ease-elastic:cubic-bezier(0.5,2,0.3,0.8);--ease-elastic-2:cubic-bezier(0.5,-1,0.3,0.8);--primary:#ff8800;--rounded-max:100px;--rounded-min:10px;--h:78px}.area .area-wrapper{position:relative;padding:20px 5px;cursor:pointer}.area .area-wrapper:hover .wrapper{transform:translateY(0) scale(1)}.area .area-wrapper:hover .wrapper .case .mask{box-shadow:inset 8px -15px 15px -10px black,inset 10px -17px 12px -12px white,0 20px 50px -5px #111}.area .area-wrapper:hover .part-2 .glass{box-shadow:inset 0 0 7px -4px white,inset 0 -10px 10px -8px rgba(255,255,255,0.4),inset 8px -15px 15px -10px black,inset 8px -10px 12px -12px white,0 20px 50px -5px #111}.area svg{overflow:visible}.wrapper{display:block;border-radius:100px;position:relative;z-index:2;transition:all 0.6s var(--ease-elastic);transform:translateY(-10px) scale(1.02)}.wrapper input{position:absolute;background:transparent;opacity:0;width:100%;height:100%;inset:0;z-index:10;cursor:pointer;pointer-events:all;user-select:none;outline:none}.wrapper .button{background:transparent;display:flex;border:none;padding:0;margin:0}.wrapper .button::before{content:"";top:0;bottom:0;left:25%;width:70%;height:100%;margin:auto;border-radius:0 50% 50% 0;position:absolute;pointer-events:none;background:var(--primary);background:linear-gradient(to right,var(--primary) 0%,transparent 100%);z-index:1;filter:blur(30px);mix-blend-mode:color-dodge;transition:all 1s ease 0.4s;opacity:0}.wrapper .button::after{content:"";width:50px;height:50px;top:0;bottom:0;left:28%;margin:auto;border-radius:50%;position:absolute;pointer-events:none;background:var(--primary);z-index:2;filter:blur(15px);mix-blend-mode:color-dodge;transition:all 1s ease 0.4s;opacity:0}.wrapper .button .part-1{position:relative;z-index:1;height:var(--h);width:80px;border-radius:var(--rounded-max) var(--rounded-min) var(--rounded-min) var(--rounded-max)}.wrapper .button .part-1 .line{position:absolute;top:0;bottom:0;right:-1px;transition:all 0.4s ease}.wrapper .button .part-1 .line::before{position:absolute;top:0;bottom:0;right:0;content:"";width:1px;background:white;box-shadow:1px 0 10px 3px #ffa600;border-radius:50%;height:0%;margin:auto;animation:1.8s line ease infinite}.wrapper .button .part-1 .screw{position:absolute;top:0;right:0;bottom:0;margin:auto;z-index:-1;overflow:hidden;padding:10px 0}.wrapper .button .part-1 .screw svg{width:auto;height:60px}.wrapper .button .part-1 .screw svg g{transform-origin:center}.wrapper .button .part-1 .screw svg .dot{color:#8e8c8b}.wrapper .button .part-1 .case{height:var(--h);width:80px;border-radius:inherit;transform:translateX(-40px);transition:all 0.9s var(--ease-elastic)}.wrapper .button .part-1 .case .mask{position:absolute;overflow:hidden;inset:0;border-radius:inherit;background:linear-gradient(to bottom,#2c2e31 0%,#31343e 20%,#212329 100%);box-shadow:inset 8px -15px 15px -10px black,inset 10px -17px 12px -12px white,0 30px 70px -5px #111;transition:all 0.9s var(--ease-elastic)}.wrapper .button .part-1 .case .mask::before{content:"";position:absolute;border-radius:inherit;left:30%;top:23%;width:100%;height:30%;background:white;filter:blur(12px)}.wrapper .button .part-1 .case .mask::after{content:"";position:absolute;right:0;top:0;bottom:0;width:4px;background-color:rgba(255,255,255,0.2);mix-blend-mode:overlay}.wrapper .button .part-2{position:relative;height:var(--h);width:190px;border-radius:var(--rounded-min) var(--rounded-max) var(--rounded-max) var(--rounded-min);display:flex;align-items:center;justify-content:center;transition:all 0.6s ease}.wrapper .button .part-2 .glass{position:relative;overflow:hidden;height:100%;width:100%;transition:all 0.9s var(--ease-elastic);border-radius:inherit;border-left:1px solid rgba(0,0,0,0.3);background:linear-gradient(to bottom,rgba(255,255,255,0.15) 0%,rgba(255,255,255,0.2) 50%,rgba(0,0,0,0.5) 100%);box-shadow:inset 0 0 7px -4px white,inset 0 -10px 10px -8px rgba(255,255,255,0.4),inset 8px -15px 15px -10px black,inset 8px -10px 12px -12px white,0 30px 70px -5px #111}.wrapper .button .part-2 .glass::before{content:"";position:absolute;left:0;top:10%;right:14%;height:70%;border-radius:0 25px 0 0;background:linear-gradient(to bottom,rgba(255,255,255,0.5) 0%,rgba(255,255,255,0) 60%)}.wrapper .button .part-2 .glass::after{content:"";position:absolute;left:0;bottom:15%;right:5%;height:75%;border-radius:0 30px 30px 0;box-shadow:inset -2px -6px 5px -5px rgba(255,255,255,0.8);filter:blur(3px)}.wrapper .button .part-2 .glass .glass-reflex{position:absolute;inset:0;width:70%;border-radius:0 50% 50% 0;background:linear-gradient(to right,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.2) 100%);transform:translateX(-115%) skewX(30deg)}.wrapper .button .part-2 .glass .glass-noise{position:absolute;inset:0;opacity:0.2}.wrapper .button .part-2 .path-glass{position:absolute;inset:0;transition:opacity 0.6s linear;opacity:0}.wrapper .button .part-2 .path-glass path{stroke-dashoffset:430;stroke-dasharray:430 430;animation:1.4s path-glass ease infinite}@keyframes path-glass{0%{stroke-dasharray:430 430;color:greenyellow;opacity:1;filter:blur(2px)}50%{stroke-dasharray:860 430;opacity:1;filter:blur(4px)}100%{stroke-dasharray:860 430;color:var(--primary);opacity:0}}.wrapper .button .part-2 .filament{position:absolute;left:0;top:0;bottom:0;margin:auto;width:auto;height:26px;stroke-width:2px;opacity:0.3}.wrapper .button .part-2 .filament path{transition:all 0.6s ease-in-out}.wrapper .button .part-2 .filament-on{opacity:1}.wrapper .button .part-2 .filament-on path{stroke-dashoffset:100;stroke-dasharray:100 100}.wrapper .button .part-2 .filament-blur{opacity:1;filter:blur(8px);color:rgb(255,208,0);stroke-width:10px}.text{transition:all 0.3s ease;transform:translateY(-4px);display:flex;align-items:center;justify-content:center;letter-spacing:0.16em;position:absolute;inset:0}.text span{display:block;color:transparent;position:relative}.text.state-1 span:nth-child(3){margin-right:5px}.text.state-2 span:nth-child(4),.text.state-2 span:nth-child(6){margin-right:5px}.text span::before,.text span::after{content:attr(data-label);position:absolute;font-size:18px;left:0;color:rgba(255,255,255,0.9)}.text span::before{opacity:0;transform:translateY(-100%)}.area-wrapper input:checked ~ .button .filament path{transition-delay:0.6s}.area-wrapper:hover input:checked ~ .button .filament path{stroke-dasharray:100 0}.area-wrapper input:checked ~ .button .part-1 .case{transform:translateX(0px);transition:all 1.25s var(--ease-elastic-2)}.area-wrapper:hover input:checked ~ .button::before,.area-wrapper:hover input:checked ~ .button::after,.area-wrapper:hover input:checked ~ .button .path-glass{opacity:1}.area-wrapper:hover .button .part-1 .line{opacity:0}.area-wrapper input:not(:checked) ~ .button .part-1 .line::before{box-shadow:1px 0 10px 3px rgba(255,220,145,0.4);background:rgb(140,140,140)}.area-wrapper:hover .glass-reflex{animation:reflex 0.6s ease}.area-wrapper:hover .text span::before{animation:char-in 1s ease calc(var(--i) * 0.03s) forwards}.area-wrapper:hover .text span::after,.area-wrapper input:not(:checked) ~ .button .text.state-1 span::before,.area-wrapper input:not(:checked) ~ .button .text.state-1 span::after,.area-wrapper input:checked ~ .button .text.state-2 span::before,.area-wrapper input:checked ~ .button .text.state-2 span::after{opacity:0;animation:char-out 1.3s ease calc(var(--i) * 0.04s) backwards}.area-wrapper input:not(:checked) ~ .button .part-1 .screw g{animation:pulse 0.8s ease calc(var(--i) * 0.1s) backwards}.area-wrapper input:checked ~ .button .part-1 .screw g{animation:pulse-out 0.8s ease calc((5 - var(--i)) * 0.2s) backwards}.area-wrapper input:not(:checked) ~ .button .part-1 .screw .dot{animation:dot 0.7s ease calc(var(--i) * 0.15s) backwards}.area-wrapper input:checked ~ .button .part-1 .screw .dot{animation:dot-out 0.7s ease calc((3 - var(--i)) * 0.15s) forwards}@keyframes line{0%{height:0%;opacity:1}50%{height:100%;opacity:1}100%{height:140%;opacity:0}}@keyframes dot{30%{color:var(--primary);filter:blur(2px)}}@keyframes dot-out{40%{color:white;filter:blur(2px)}}@keyframes pulse{30%{transform:scaleY(0.8)}}@keyframes pulse-out{40%{transform:scaleY(0.8)}}@keyframes char-in{0%{opacity:0;transform:scale(10) translateX(-25%);filter:blur(10px);color:rgb(0,251,255)}25%{transform:translateY(-15%);opacity:1;filter:blur(1px);color:var(--primary)}50%{transform:translateY(7%);opacity:1;filter:blur(0)}100%{transform:translateY(0);opacity:1;filter:blur(0)}}@keyframes char-out{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-70%);opacity:0;filter:blur(4px)}}@keyframes reflex{0%{transform:translateX(-115%)}100%{transform:translateX(140%)}}
        footer.footer {
          text-align: center;
          padding: clamp(24px, 4vh, 40px) clamp(20px, 5vw, 48px);
          font-size: clamp(0.85rem, 1.5vw, 0.95rem);
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          color: #888;
          border-top: 1px solid #2e2e30;
          background: rgba(13, 13, 13, 0.8);
          backdrop-filter: blur(10px);
          margin-top: auto;
          width: 100%;
          max-width: 100%;
          letter-spacing: 0.02em;
        }
        @media (max-width: 900px) {
          ul.nav-links {
            display: none;
          }
          nav.navbar {
            padding: 20px 24px;
          }
          .nav-button-container {
            width: 170px;
            height: 45px;
          }
          .nav-button {
            width: 160px;
            height: 40px;
          }
          .nav-right .nav-title {
            font-size: 0.8rem;
            letter-spacing: 0.3px;
          }
          .nav-filament .nav-icon {
            width: 18px;
            height: 18px;
          }
          .bg-orb-1 {
            width: 400px;
            height: 400px;
          }
          .bg-orb-2 {
            width: 350px;
            height: 350px;
          }
          .bg-orb-3 {
            width: 300px;
            height: 300px;
          }
          .bg-grid {
            background-size: 40px 40px;
          }
        }
        @media (max-width: 600px) {
          .hero-buttons {
            flex-direction: column;
            gap: 12px;
            width: 100%;
            max-width: 300px;
          }
          .button-container {
            width: 100%;
            max-width: 280px;
          }
          .button {
            width: 240px;
          }
          main.hero-section {
            padding: 40px 20px;
          }
          .bg-orb-1 {
            width: 300px;
            height: 300px;
            opacity: 0.5;
          }
          .bg-orb-2 {
            width: 250px;
            height: 250px;
            opacity: 0.5;
          }
          .bg-orb-3 {
            width: 200px;
            height: 200px;
            opacity: 0.4;
          }
          .bg-grid {
            background-size: 30px 30px;
            opacity: 0.5;
          }
          .particle {
            width: 2px;
            height: 2px;
          }
        }
        @media (min-width: 1600px) {
          .bg-orb-1 {
            width: 800px;
            height: 800px;
          }
          .bg-orb-2 {
            width: 700px;
            height: 700px;
          }
          .bg-orb-3 {
            width: 600px;
            height: 600px;
          }
          .bg-grid {
            background-size: 60px 60px;
          }
        }
      `}</style>

      <div className="container">
        {/* Animated Background Elements */}
        <div className="bg-overlay">
          <div className="bg-grid"></div>
          <div className="bg-orb bg-orb-1"></div>
          <div className="bg-orb bg-orb-2"></div>
          <div className="bg-orb bg-orb-3"></div>
          <div className="bg-particles">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="particle" style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}></div>
            ))}
          </div>
          <div className="bg-lines">
            <div className="line line-1"></div>
            <div className="line line-2"></div>
            <div className="line line-3"></div>
          </div>
        </div>

        <nav className="navbar">
          <div className="logo">Vagle AI</div>
          <ul className="nav-links">
            <li><a href="#workflows">WORKFLOWS</a></li>
            <li><a href="#use-cases">USE CASES</a></li>
            <li><a href="#pricing">PRICING</a></li>
            <li><a href="#docs">DOCS</a></li>
            <li><a href="#resources">RESOURCES</a></li>
          </ul>
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <div className="nav-button-container">
              <button className="nav-button">
                <div className="nav-left"></div>
                <div className="nav-right">
                  <span className="nav-filament">
                    <svg
                      className="nav-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </span>
                  <span className="nav-title">Dashboard</span>
                </div>
                <div className="nav-glow"></div>
              </button>
            </div>
          </Link>
        </nav>

        <main className="hero-section">
          <h1 className="hero-title">
            AI agents
          </h1>
          <p className="hero-subtitle">
            Build voice applications with Vagle Ai's platform.
          </p>
          <div className="hero-buttons">
            <LightbulbButton />
          </div>
        </main>

        <footer className="footer">
          © 2025 Vagle Ai. All rights reserved.
        </footer>
      </div>
    </>
  );
}

