import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import SurveyEmbed from './components/SurveyEmbed';
import KurukuruLogo from './components/KurukuruLogo';
import './App.css';

function App() {
  const { scrollYProgress } = useScroll();
  
  // Parallax constraints
  const heroY = useTransform(scrollYProgress, [0, 0.5], ['0%', '100%']);
  const fogOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0.1]);

  return (
    <div className="app-container">
      {/* Dynamic Parallax Fog Background overlay */}
      <motion.div 
        className="fog-overlay"
        style={{ opacity: fogOpacity }}
      />

      {/* Hexbin floating background particles (simulating PostGIS map) */}
      <div className="hex-particles"></div>

      <header className="hero-section">
        <motion.div 
          className="hero-content" 
          style={{ y: heroY }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <div className="logo-wrapper">
            <KurukuruLogo width={220} height={60} />
          </div>
          <h1 className="hero-title">Eradicate the Taxi Stigma.</h1>
          <p className="hero-subtitle">
            The hyper-local peer-to-peer campus mobility engine. Join the exclusive `.edu` Walled Garden.
          </p>
          <button className="btn-primary" onClick={() => window.scrollTo({top: 800, behavior: 'smooth'})}>
            <span>Join the Vanguard</span>
            <div className="btn-glow"></div>
          </button>
        </motion.div>
      </header>

      <main className="main-content">
        {/* Asymmetric Journey Layout */}
        <section className="journey-section">
          
          <motion.div 
            className="journey-module left-aligned glass-panel"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="module-content">
              <span className="pill">Matchmaking Engine</span>
              <h2>Pilots & Co-Pilots. Equals.</h2>
              <p>
                We intentionally removed "Driver" and "Rider" from our vocabulary. Instantly flip a switch in the app to offer your vehicle as a <strong>Pilot</strong>, or drop a pin to find a super-fast 2-minute trip as a <strong>Co-Pilot</strong>. No formal hierarchy, no bargaining in the 95°F heat.
              </p>
            </div>
            <div className="module-visual visual-pilot"></div>
          </motion.div>

          <motion.div 
            className="journey-module right-aligned glass-panel"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="module-visual visual-fog"></div>
            <div className="module-content">
              <span className="pill alt-glow">Hexbin Trajectory</span>
              <h2>Unmask the Fog of War</h2>
              <p>
                Your campus map natively starts completely shrouded in a stylish dark shadow. As you physically move, the PostGIS engine permanently <em>burns away</em> the fog. Be the very first student to unmask a coordinate, and you'll drop a Pioneer Landmark note for future explorers.
              </p>
            </div>
          </motion.div>

          <motion.div 
            className="journey-module center-aligned glass-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="module-content center-content">
              <span className="pill coin-glow">Frictionless Ledger</span>
              <h2>Kurukuru Coins 🪙</h2>
              <p>
                No cash. No scanning ₹10 UPI codes. 
                Trips strictly deduct dynamically calculated KuruCoins from the Co-Pilot based on live fuel efficiency algorithms, instantly dropping them into the Pilot's Vault. Hoard them, trade them, or easily cash them out.
              </p>
            </div>
          </motion.div>

        </section>

        <section className="survey-section">
          <SurveyEmbed 
            title="Scan the Sector" 
            description="We are launching soon across massive campuses in India. Reserve your Pioneer status."
          />
        </section>
      </main>

      <footer className="footer-section">
        <p>© 2026 Kurukuru. Exploring the Neon Frontier.</p>
      </footer>
    </div>
  );
}

export default App;
