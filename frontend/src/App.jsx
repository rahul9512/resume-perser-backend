import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./pages/Auth";
import UploadResume from "./pages/UploadResume";
import JobDescription from "./pages/JobDescription";
import { Trash2, History, RefreshCcw, Eye, EyeOff, BarChart3, ShieldCheck, Zap } from "lucide-react";
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
        <h2 style={{ color: 'white', letterSpacing: '0.2em' }}>INITIALIZING PULSE V2.0...</h2>
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
  const [showProcessed, setShowProcessed] = useState(false); // HR View Toggle

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
    setAnalyzing(true);
    setCurrentJobId(targetJobId);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const url = new URL(`${API_BASE_URL}/match-resumes`);
      url.searchParams.append("job_id", targetJobId);
      if (resumeId) url.searchParams.append("resume_id", resumeId);

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (resumeId) {
        setResults(prev => {
          const others = prev.filter(r => r.id !== data[0]?.id);
          return [...data, ...others];
        });
      } else {
        setResults(data);
      }
      fetchHistory();
    } catch (e) {
      console.error(e);
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
            PULSE <span className="brand-badge">Engine v2.0</span>
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
                  <UploadResume onUploadSuccess={(id) => runAnalysis(null, id)} apiUrl={API_BASE_URL} />
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

              {/* Workforce Library (Moved to Top) */}
              <section className="library-section animate-fade-in" style={{ marginTop: '5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                  <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <History size={32} color="var(--primary)" /> Workforce Library
                  </h2>

                  <div className="hr-toggle-container">
                    <span className="hr-toggle-label">HR GATEWAY</span>
                    <button
                      className={`btn-hr-view ${showProcessed ? 'active' : ''}`}
                      onClick={() => setShowProcessed(!showProcessed)}
                    >
                      {showProcessed ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Eye size={16} /> SHOWING ALL</span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><EyeOff size={16} /> VIEW PROCESSED</span>
                      )}
                    </button>
                  </div>
                </div>

                {history.length > 0 ? (
                  <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>CANDIDATE / SOURCE FILE</th>
                          <th>SYNC STATUS</th>
                          <th>TIMESTAMP</th>
                          <th style={{ textAlign: 'right' }}>CONTROL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const processedIds = new Set(results.map(r => r.id));
                          const dedupedHistory = [];
                          const seen = new Set();

                          [...history]
                            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                            .forEach(item => {
                              const key = item.filename.trim().toLowerCase();
                              if (!seen.has(key)) {
                                seen.add(key);
                                dedupedHistory.push(item);
                              }
                            });

                          // SHOW ALL RESUMES BY DEFAULT - Sorting latest first ensures the "Attendance Sheet" (newest) is on top
                          const displayed = dedupedHistory;

                          if (displayed.length === 0) {
                            return (
                              <tr>
                                <td colSpan="4" className="empty-state">
                                  {showProcessed ? "No records found." : "All candidates currently analyzed. Enable HR Gateway for full history."}
                                </td>
                              </tr>
                            );
                          }

                          return displayed.map(item => {
                            const isProcessed = processedIds.has(item.id);
                            const isNew = (new Date() - new Date(item.created_at)) < (24 * 60 * 60 * 1000);
                            return (
                              <tr key={item.id} style={{ opacity: isProcessed ? 0.6 : 1 }}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600 }}>
                                    {item.filename}
                                    {!isProcessed && isNew && <span className="badge-new">NEW</span>}
                                  </div>
                                </td>
                                <td>
                                  <span className={`status-tag ${isProcessed ? 'processed' : 'pending'}`}>
                                    {isProcessed ? "✓ ANALYZED" : "● PENDING"}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                  {new Date(item.created_at).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    {!isProcessed && (
                                      <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', width: 'auto' }} onClick={() => runAnalysis(null, item.id)}>Analyze</button>
                                    )}
                                    <button className="btn-secondary" style={{ padding: '8px', color: '#ff4444' }} onClick={() => handleDeleteResume(item.id)}><Trash2 size={16} /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>
                    <p>Workforce library is currently empty.</p>
                  </div>
                )}
              </section>

              {/* Candidates Ranking Results */}
              <section className="results-section animate-slide-up" style={{ marginTop: '6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
                  <div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Top Matches</h2>
                    <p style={{ color: 'var(--text-dim)' }}>Ranked by AI weighted scoring algorithm</p>
                  </div>
                  {currentJobId && (
                    <button className="btn-secondary" onClick={() => runAnalysis(currentJobId)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RefreshCcw size={18} className={analyzing ? "animate-spin" : ""} /> {analyzing ? "Ranking..." : "Refresh Scores"}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {results.length > 0 ? results.map((res, i) => (
                    <div key={res.id || i} className={`glass-panel candidate-card animate-slide-up ${res.eligibility === 'Eligible' ? 'eligible' : 'not-eligible'}`} style={{ animationDelay: `${i * 0.1}s` }}>
                      <div className="card-content">
                        <div className="card-header">
                          <h4 className="candidate-name">{res.filename || `Candidate #${i + 1}`}</h4>
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
                  )) : (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '5rem', opacity: 0.5, borderStyle: 'dashed' }}>
                      <BarChart3 size={48} style={{ marginBottom: '1.5rem', color: 'var(--primary)' }} />
                      <p>Run analysis to generate candidate ranking reports.</p>
                    </div>
                  )}
                </div>
              </section>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
