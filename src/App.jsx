import CubeMark from './components/CubeMark';
import FogGrid from './components/FogGrid';
import Reveal from './components/Reveal';
import SurveyEmbed from './components/SurveyEmbed';
import useReveal from './components/useReveal';
import './App.css';

const PROTOTYPE_SRC = '/prototype/index.html';

function Cloud({ left, top, width, delay = 0 }) {
  return <div className="cloud" style={{ left, top, width, animationDelay: `${-delay}s` }} />;
}

function Nav() {
  return (
    <nav>
      <div className="wrap">
        <a className="brand" href="#top"><CubeMark />KURUKURU</a>
        <div className="nl">
          <a href="#how">How it works</a>
          <a href="#roles">Pilots and Co-Pilots</a>
          <a href="#explore">Explore</a>
          <a href="#vault">Vault</a>
        </div>
        <a className="btn" href="#get">Join the Vanguard</a>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="hero" id="top">
      <Cloud left="6%" top={60} width={120} />
      <Cloud left="48%" top={130} width={150} delay={14} />
      <Cloud left="82%" top={50} width={100} delay={26} />
      <div className="wrap">
        <div>
          <span className="chip">For KIIT students only</span>
          <h1>Eradicate the Taxi Stigma.</h1>
          <p className="lead">The hyper-local peer-to-peer campus mobility engine. Join the exclusive .edu Walled Garden.</p>
          <div className="cta">
            <a className="btn" href="#get">Join the Vanguard</a>
            <a className="btn alt" href="#how">See how it works</a>
          </div>
        </div>
        <div className="phone-col">
          <div className="phone">
            <iframe src={PROTOTYPE_SRC} title="Kurukuru app prototype" loading="lazy" />
          </div>
          <span className="cap">Live prototype. Tap around.</span>
        </div>
      </div>
      <div className="ground" />
    </header>
  );
}

function HowItWorks() {
  return (
    <section className="s" id="how">
      <div className="wrap">
        <Reveal className="head">
          <span className="chip" style={{ alignSelf: 'flex-start' }}>How it works</span>
          <h2>Three steps from here to there</h2>
        </Reveal>
        <div className="steps">
          <Reveal className="blk step">
            <div className="num">1</div>
            <h3>Plan a ride</h3>
            <p>Pick a start and a destination. Add a time and repeat days if the trip happens every week. Choose Pilot if you are driving or Co-Pilot if you need a lift.</p>
          </Reveal>
          <Reveal className="blk step" delay={0.1}>
            <div className="num">2</div>
            <h3>Get matched</h3>
            <p>
              Every match has a <span className="mk" style={{ background: 'var(--g1)' }}>Kuru in</span> and a{' '}
              <span className="mk" style={{ background: 'var(--gold)' }}>Kuru out</span> point, where the Co-Pilot gets on and off the Pilot's route.
            </p>
          </Reveal>
          <Reveal className="blk step" delay={0.2}>
            <div className="num">3</div>
            <h3>Ride and earn</h3>
            <p>Finish the trip to collect coins in your Vault and XP toward your next level. New badges unlock along the way.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section className="s alt-bg" id="roles">
      <div className="wrap">
        <Reveal className="head">
          <span className="chip" style={{ alignSelf: 'flex-start' }}>Matchmaking Engine</span>
          <h2>Pilots &amp; Co-Pilots. Equals.</h2>
          <p>
            We intentionally removed "Driver" and "Rider" from our vocabulary. Instantly flip a switch in the app to offer your vehicle as a <strong>Pilot</strong>, or drop a pin to find a super-fast 2-minute trip as a <strong>Co-Pilot</strong>. No formal hierarchy, no bargaining in the 95°F heat.
          </p>
        </Reveal>
        <div className="two">
          <Reveal className="blk role" style={{ background: '#E6F1D6' }}>
            <span className="mk" style={{ background: 'var(--g1)', alignSelf: 'flex-start' }}>Pilot</span>
            <h3>You are driving</h3>
            <ul>
              <li><i /><p>See your full route from start to destination.</p></li>
              <li><i /><p>See each Co-Pilot's Kuru in and Kuru out, highlighted on your route.</p></li>
              <li><i /><p>Accept or decline a match and earn coins for the ride.</p></li>
            </ul>
          </Reveal>
          <Reveal className="blk role" style={{ background: '#FBF0CF' }} delay={0.1}>
            <span className="mk" style={{ background: 'var(--gold)', alignSelf: 'flex-start' }}>Co-Pilot</span>
            <h3>You need a lift</h3>
            <ul>
              <li><i style={{ background: 'var(--gold)' }} /><p>See only your Kuru in and Kuru out on the map.</p></li>
              <li><i style={{ background: 'var(--gold)' }} /><p>The Pilot's route stays private. You get the pickup time and the fare.</p></li>
              <li><i style={{ background: 'var(--gold)' }} /><p>Confirm the ride, or cancel before it starts.</p></li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Explore() {
  return (
    <section className="s" id="explore">
      <div className="wrap explore">
        <Reveal>
          <span className="chip">Hexbin Trajectory</span>
          <h2 style={{ margin: '16px 0 20px' }}>Unmask the Fog of War</h2>
          <p style={{ fontSize: 19 }}>
            Your campus map natively starts completely shrouded in a stylish dark shadow. As you physically move, the PostGIS engine permanently <em>burns away</em> the fog. Be the very first student to unmask a coordinate, and you'll drop a Pioneer Landmark note for future explorers.
          </p>
          <div className="pts">
            <div>
              <span className="mini" style={{ background: 'var(--red)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="1" width="2.5" height="14" fill="#1F2A1D" /><path d="M5.5 2h8v6h-8z" fill="#fff" /></svg>
              </span>
              <p><b>Plant a flag</b>Leave a landmark note wherever you are, from any screen with a map.</p>
            </div>
            <div>
              <span className="mini" style={{ background: 'var(--g1)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" fill="none" stroke="#1F2A1D" strokeWidth="3" /></svg>
              </span>
              <p><b>Discover new territory</b>New ground earns +50 XP.</p>
            </div>
            <div>
              <span className="mini" style={{ background: 'var(--gold)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="1" width="2.5" height="14" fill="#1F2A1D" /><path d="M5.5 2h8v6h-8z" fill="#1F2A1D" /></svg>
              </span>
              <p><b>First to find it</b>Gold flags mark places nobody else has found yet.</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <FogGrid />
        </Reveal>
      </div>
    </section>
  );
}

function XpBars() {
  const [ref, seen] = useReveal();
  return (
    <div className="xp" ref={ref}>
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} className={seen && i < 7 ? 'on' : ''} style={{ transitionDelay: seen ? `${200 + i * 110}ms` : undefined }} />
      ))}
    </div>
  );
}

function Vault() {
  return (
    <section className="s alt-bg" id="vault">
      <div className="wrap">
        <Reveal className="head">
          <span className="chip" style={{ alignSelf: 'flex-start' }}>Frictionless Ledger</span>
          <h2>Kurukuru Coins</h2>
          <p>
            No cash. No scanning ₹10 UPI codes. Trips strictly deduct dynamically calculated KuruCoins from the Co-Pilot based on live fuel efficiency algorithms, instantly dropping them into the Pilot's Vault. Hoard them, trade them, or easily cash them out.
          </p>
        </Reveal>
        <div className="vault">
          <Reveal className="blk vc">
            <svg width="56" height="56" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="3" fill="#E8B23A" stroke="#1F2A1D" strokeWidth="2.5" />
              <rect x="5" y="5" width="6" height="3" fill="#F6D77A" />
              <rect x="4" y="16" width="16" height="3" fill="#B98A1E" />
              <rect x="10" y="9" width="4" height="6" fill="#B98A1E" />
            </svg>
            <h3>Coins</h3>
            <p>Earn coins for every ride you offer. Spend them as a Co-Pilot. Your balance lives in the Vault.</p>
          </Reveal>
          <Reveal className="blk vc" delay={0.1}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="lv">7</div>
              <div style={{ flex: 1 }}><XpBars /></div>
            </div>
            <h3>XP and levels</h3>
            <p>Rides, flags and new territory fill your XP bar. Fill it and you level up.</p>
          </Reveal>
          <Reveal className="blk vc" delay={0.2}>
            <div style={{ width: 56, height: 56, background: 'var(--g1)', border: '3px solid var(--ink)', borderRadius: 6, boxShadow: 'inset 0 -6px 0 var(--g2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="2" width="3" height="21" fill="#1F2A1D" />
                <path d="M7 3h13v9H7z" fill="#E8B23A" stroke="#1F2A1D" strokeWidth="2.5" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Badges</h3>
            <p>Unlock badges like Trailblazer by discovering new spots around campus.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function CampusOnly() {
  return (
    <section className="only">
      <div className="wrap">
        <div>
          <h2>Campus only.</h2>
          <p style={{ marginTop: 10, maxWidth: 460 }}>Sign in with a kiit.ac.in email. Nobody else gets in.</p>
        </div>
        <div className="mail">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <rect x="2" y="9" width="18" height="11" fill="#8E8C82" stroke="#1F2A1D" strokeWidth="2.5" />
            <rect x="5" y="2" width="12" height="9" fill="none" stroke="#1F2A1D" strokeWidth="2.5" />
          </svg>
          you@kiit.ac.in
        </div>
      </div>
    </section>
  );
}

function Final() {
  return (
    <section className="final" id="get">
      <Cloud left="8%" top={50} width={110} />
      <Cloud left="76%" top={90} width={130} delay={20} />
      <div className="wrap">
        <h2>Scan the Sector</h2>
        <p className="final-note">We are launching soon across massive campuses in India. Reserve your Pioneer status.</p>
        <SurveyEmbed />
      </div>
      <div className="ground" />
      <div className="dirt" />
    </section>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <HowItWorks />
      <Roles />
      <Explore />
      <Vault />
      <CampusOnly />
      <Final />
      <footer>
        <div className="wrap">
          <span className="px" style={{ fontSize: 20, letterSpacing: 2 }}>KURUKURU</span>
          <span>
            <a href="/privacy" style={{ color: 'inherit' }}>Privacy</a> · <a href="/terms" style={{ color: 'inherit' }}>Terms</a> · <a href="/delete-account" style={{ color: 'inherit' }}>Delete account</a> · <a href="/support" style={{ color: 'inherit' }}>Support</a>
          </span>
          <span>© 2026 Kurukuru. Exploring the Neon Frontier.</span>
        </div>
      </footer>
    </>
  );
}
