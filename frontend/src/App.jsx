import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./pages/Auth";
import UploadResume from "./pages/UploadResume";
import JobDescription from "./pages/JobDescription";
import "./App.css";

// Protected Route Component
const ProtectedRoute = ({ session, loading, children }) => {
  if (loading) return (
    <div className="page-container">
      <div className="animate-float">
        <h2 style={{ color: 'white' }}>Loading...</h2>
      </div>
    </div>
  );

  if (!session) return <Navigate to="/login" />;

  return children;
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchLatestResults = async (jobId) => {
    setAnalyzing(true);
    const { data: { session } } = await supabase.auth.getSession();

    try {
      // 1. Trigger or fetch results
      const res = await fetch(`http://127.0.0.1:8000/match-resumes?job_id=${jobId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  return (
    <BrowserRouter>
      {/* Decorative Background Elements */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      <div className="app-container">
        <nav style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.75rem',
            margin: 0,
            background: 'linear-gradient(135deg, var(--primary), var(--secondary), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 800
          }}>
            Resume AI
          </h1>
          {session && (
            <button onClick={handleLogout} className="btn-secondary">Logout</button>
          )}
        </nav>

        <Routes>
          <Route
            path="/login"
            element={session ? <Navigate to="/" /> : <Auth />}
          />
          <Route path="/" element={
            <ProtectedRoute session={session} loading={loading}>
              <div className="dashboard-grid animate-fade-in">
                <div className="glass-panel card">
                  <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <span style={{
                      background: 'var(--primary)',
                      padding: '8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 5px 15px rgba(139, 92, 246, 0.3)'
                    }}>📄</span>
                    Upload Resume
                  </h2>
                  <UploadResume />
                </div>
                <div className="glass-panel card">
                  <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <span style={{
                      background: 'var(--accent)',
                      padding: '8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 5px 15px rgba(244, 63, 94, 0.3)'
                    }}>💼</span>
                    Job Details
                  </h2>
                  <JobDescription onAnalysisStarted={fetchLatestResults} />
                </div>
              </div>

              {/* Ranking Results Section */}
              <div style={{ marginTop: '3rem' }} className="animate-fade-in">
                <h2 style={{ fontSize: '2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  Ranked Candidates {analyzing && <span className="animate-pulse" style={{ fontSize: '1rem', color: 'var(--primary)' }}>Analyzing...</span>}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {results.length > 0 ? results.map((res, i) => (
                    <div key={i} className="glass-panel animate-slide-up" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `6px solid ${res.eligibility === 'Eligible' ? '#10b981' : '#ef4444'}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.75rem' }}>
                          <h3 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>{(typeof res === 'object' && res.filename) || `Candidate #${i + 1}`}</h3>
                          <span style={{
                            fontSize: '0.8rem',
                            background: res.eligibility === 'Eligible' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: res.eligibility === 'Eligible' ? '#10b981' : '#ef4444',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            border: `1px solid ${res.eligibility === 'Eligible' ? '#10b981' : '#ef4444'}`
                          }}>
                            {res.eligibility || "Processing"}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {res.details?.matched_skills && res.details.matched_skills.map(s => (
                            <span key={s} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                        <div>
                          <p style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{Math.round(res.match_score) || 0}<span style={{ fontSize: '1.2rem', opacity: 0.5 }}>%</span></p>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', marginTop: '6px', fontWeight: 600 }}>Confidence Score</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {res.file_url && (
                            <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', minWidth: '120px' }} onClick={() => window.open(res.file_url, '_blank')}>
                              View Resume
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="glass-panel card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                      <p>Start an analysis to browse top matches.</p>
                    </div>
                  )}
                </div>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
