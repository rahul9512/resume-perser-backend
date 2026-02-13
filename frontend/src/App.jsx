import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./pages/Auth";
import UploadResume from "./pages/UploadResume";
import JobDescription from "./pages/JobDescription";
import { Trash2, RefreshCcw, BarChart3, ShieldCheck, Zap } from "lucide-react";
import "./App.css";

// --- CONFIGURATION ---
const RENDER_BACKEND_URL = "https://resume-perser-backend-2.onrender.com";

const getApiUrl = () => {
  if (window.location.hostname.includes("vercel.app")) return RENDER_BACKEND_URL;
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.includes("127.0.0.1") && !envUrl.includes("localhost")) return envUrl;
  return "http://127.0.0.1:8000";
};

const API_BASE_URL = getApiUrl();

const ProtectedRoute = ({ session, loading, children }) => {
  if (loading) return (
    <div className="page-container">
      <div className="animate-pulse-slow">
        <h2 style={{ color: 'white', letterSpacing: '0.2em' }}>RESUME PARSER v2.0...</h2>
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
  const [history, setHistory] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) fetchHistory();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session) fetchHistory();
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchHistory = async () => {
    const { data } = await supabase.table("resumes").select("*").order("created_at", { ascending: false });
    if (data) setHistory(data);
  };

  const handleDeleteResume = async (id) => {
    if (!window.confirm("Permanent delete? This cannot be undone.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE_URL}/resume/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
        setResults(prev => prev.filter(item => item.id !== id));
      }
    } catch (e) { console.error(e); }
  };

  const runAnalysis = useCallback(async (jobId, resumeId = null) => {
    const targetJobId = jobId || currentJobId;
    if (!targetJobId) return;

    let finalResumeId = resumeId;
    if (!finalResumeId && history.length > 0) {
      finalResumeId = history[0].id;
    }

    if (!finalResumeId) {
      setResults([]);
      setCurrentJobId(targetJobId);
      return;
    }

    console.log("DEBUG: Starting runAnalysis", { targetJobId, finalResumeId });
    setAnalyzing(true);
    setCurrentJobId(targetJobId);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const url = new URL(`${API_BASE_URL}/match-resumes`);
      url.searchParams.append("job_id", targetJobId);
      url.searchParams.append("resume_id", finalResumeId);

      console.log("DEBUG: Fetching from URL:", url.toString());
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const data = await res.json();
      console.log("DEBUG: API Response Received:", data);

      // Only show this specific result
      // If it's an array, set it. If it's an error object, wrap it or handle it.
      setResults(Array.isArray(data) ? data : (data.error || data.message ? [] : []));

      if (!Array.isArray(data) && (data.error || data.message)) {
        alert("Analysis Note: " + (data.error || data.message));
      }

      fetchHistory();
    } catch (e) {
      console.error("DEBUG: runAnalysis Error:", e);
      alert("Analysis engine encountered an error.");
    } finally {
      setAnalyzing(false);
    }
  }, [currentJobId]);

  return (
    <BrowserRouter>
      <div className="bg-canvas"></div>
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      <div className="app-container">
        <header className="dashboard-header animate-slide-up">
          <div className="brand-title">
            <BarChart3 size={32} />
            RESUME PARSER <span className="brand-badge">Engine v2.0</span>
          </div>
          {session && (
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div className="status-indicator">
                <span className="dot pulse"></span> <span style={{ opacity: 0.8 }}>SYSTEM LIVE</span>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="btn-secondary">Logout</button>
            </div>
          )}
        </header>

        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" /> : <Auth />} />
          <Route path="/" element={
            <ProtectedRoute session={session} loading={loading}>
              <div className="dashboard-grid animate-fade-in">
                <div className="glass-panel">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Zap size={24} color="var(--primary)" /> Smart Upload
                  </h3>
                  <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    Proprietary OCR & NLP parsing. Max 25MB per candidate.
                  </p>
                  <UploadResume
                    onUploadSuccess={(id) => {
                      fetchHistory();
                      runAnalysis(null, id);
                    }}
                    apiUrl={API_BASE_URL}
                  />
                </div>
                <div className="glass-panel">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShieldCheck size={24} color="var(--secondary)" /> Target Criteria
                  </h3>
                  <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    Define the core skills and experience for the matching engine.
                  </p>
                  <JobDescription onAnalysisStarted={(id) => runAnalysis(id)} apiUrl={API_BASE_URL} />
                </div>
              </div>



              {/* Analysis Result (Single Focus) */}
              <section className="results-section animate-slide-up" style={{ marginTop: '6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
                  <div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Analysis Result</h2>
                    <p style={{ color: 'var(--text-dim)' }}>AI extraction and matching for the latest upload</p>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {currentJobId && (
                      <button className="btn-secondary" onClick={() => runAnalysis(currentJobId)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCcw size={18} className={analyzing ? "animate-spin" : ""} /> {analyzing ? "Analyzing..." : "Refresh Result"}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {results.length > 0 ? (
                    (() => {
                      const res = results[0]; // Show only the latest
                      return (
                        <div key={res.id} className={`glass-panel candidate-card animate-slide-up ${res.eligibility === 'Eligible' ? 'eligible' : 'not-eligible'}`}>
                          <div className="card-content">
                            <div className="card-header">
                              <h4 className="candidate-name">{res.filename}</h4>
                              <span className={`status-badge ${res.eligibility === 'Eligible' ? 'eligible' : 'not-eligible'}`} style={{
                                background: res.eligibility === 'Eligible' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                color: res.eligibility === 'Eligible' ? '#34d399' : '#fb7185',
                                border: `1px solid ${res.eligibility === 'Eligible' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
                              }}>
                                {res.eligibility}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                              {res.details?.matched_skills && res.details.matched_skills.map(s => (
                                <span key={s} className="skill-tag">{s}</span>
                              ))}
                            </div>

                            <div className="card-stats">
                              <div className="stat-item">
                                <span className="stat-label">EXP. GAP</span>
                                <span className="stat-value">{res.details?.years_of_experience || 0} Years</span>
                              </div>
                              <div className="stat-item" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1.5rem' }}>
                                <span className="stat-label">ALIGNMENT</span>
                                <span className="stat-value">{Math.round(res.details?.role_similarity) || 0}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="score-container">
                            <div className="score-ring">
                              <svg viewBox="0 0 36 36" className="circular-chart" style={{ transform: 'rotate(-90deg)' }}>
                                <path className="circle-bg" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path
                                  className="circle"
                                  fill="none"
                                  stroke={res.eligibility === 'Eligible' ? '#10b981' : (res.match_score > 50 ? 'var(--primary)' : '#f43f5e')}
                                  strokeDasharray={`${res.match_score}, 100`}
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <div className="score-text">
                                <span className="score-number" style={{ color: res.eligibility === 'Eligible' ? '#10b981' : (res.match_score > 50 ? 'white' : '#f43f5e') }}>
                                  {Math.round(res.match_score) || 0}
                                </span>
                                <span className="score-percent">%</span>
                              </div>
                            </div>
                            <p className="score-label">MATCH SCORE</p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '5rem', opacity: 0.5, borderStyle: 'dashed' }}>
                      <BarChart3 size={48} style={{ marginBottom: '1.5rem', color: 'var(--primary)' }} />
                      <p>{currentJobId ? "Target criteria saved! Now upload a resume to see matching analysis results." : "Upload a resume to see matching analysis results."}</p>
                    </div>
                  )}
                </div>
              </section>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </BrowserRouter >
  );
}

export default App;
