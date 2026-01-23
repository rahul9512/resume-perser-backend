import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./pages/Auth";
import UploadResume from "./pages/UploadResume";
import JobDescription from "./pages/JobDescription";
import { Trash2, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
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
  const [currentJobId, setCurrentJobId] = useState(null);

  useEffect(() => {
    console.log("Current API URL:", import.meta.env.VITE_API_URL);
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

  const fetchLatestResults = useCallback(async (jobId) => {
    const targetJobId = jobId || currentJobId;
    if (!targetJobId) return;

    setAnalyzing(true);
    setCurrentJobId(targetJobId);
    const { data: { session } } = await supabase.auth.getSession();

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/match-resumes?job_id=${targetJobId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setResults(data);
      } else {
        console.error("Analysis data is not an array:", data);
      }
    } catch (e) {
      console.error("Fetch Results Error:", e);
    }
    setAnalyzing(false);
  }, [currentJobId]);

  const handleDeleteResume = async (id) => {
    if (!window.confirm("Are you sure you want to delete this resume? it will remove it from analysis results.")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/resume/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        // Real-time UI refresh: remove from current results list
        setResults(prev => prev.filter(item => item.id !== id));
      } else {
        const errData = await res.json();
        alert("Delete failed: " + (errData.detail || "Database error"));
      }
    } catch (e) {
      console.error(e);
      alert("Network error during delete");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <BrowserRouter>
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
          <div style={{ display: 'flex', gap: '1rem' }}>
            {session && (
              <button onClick={handleLogout} className="btn-secondary">Logout</button>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" /> : <Auth />} />
          <Route path="/" element={
            <ProtectedRoute session={session} loading={loading}>
              <div className="dashboard-grid animate-fade-in">
                <div className="glass-panel card">
                  <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <span className="icon-box">📄</span> Upload Resume
                  </h2>
                  {/* Passing refresh callback to show new resumes immediately */}
                  <UploadResume onUploadSuccess={() => currentJobId && fetchLatestResults()} />
                </div>
                <div className="glass-panel card">
                  <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <span className="icon-box" style={{ background: 'var(--accent)' }}>💼</span> Job Details
                  </h2>
                  <JobDescription onAnalysisStarted={fetchLatestResults} />
                </div>
              </div>

              <div style={{ marginTop: '3rem' }} className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
                    Ranked Candidates {analyzing && <span className="animate-pulse" style={{ fontSize: '1rem', color: 'var(--primary)' }}>Analyzing...</span>}
                  </h2>
                  {currentJobId && (
                    <button className="btn-secondary" onClick={() => fetchLatestResults()} disabled={analyzing} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <RefreshCw size={16} className={analyzing ? 'animate-spin' : ''} /> Refresh
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {results.length > 0 ? results.map((res, i) => (
                    <div key={res.id || i} className="glass-panel animate-slide-up candidate-card" style={{ borderLeft: `6px solid ${res.eligibility === 'Eligible' ? '#10b981' : '#ef4444'}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.75rem' }}>
                          <h3 style={{ fontSize: '1.4rem', margin: 0 }}>{res.filename || `Candidate #${i + 1}`}</h3>
                          <span className={`badge ${res.eligibility === 'Eligible' ? 'eligible' : 'not-eligible'}`}>
                            {res.eligibility}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {res.details?.matched_skills?.map(s => (
                            <span key={s} className="skill-tag">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                        <div>
                          <p className="score-main">{Math.round(res.match_score)}<span style={{ fontSize: '1.2rem', opacity: 0.5 }}>%</span></p>
                          <p className="score-sub">Confidence</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <button className="btn-secondary btn-sm" onClick={() => window.open(res.file_url, '_blank')}>View</button>
                          <button
                            className="btn-delete"
                            style={{ padding: '6px', fontSize: '0.7rem' }}
                            onClick={() => handleDeleteResume(res.id)}
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="glass-panel card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                      <p>Upload a resume and enter job details to see top matches.</p>
                      {currentJobId && <p style={{ fontSize: '0.9rem' }}>Or click Refresh to analyze existing resumes.</p>}
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
