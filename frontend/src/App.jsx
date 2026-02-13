import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./pages/Auth";
import UploadResume from "./pages/UploadResume";
import JobDescription from "./pages/JobDescription";
import { Trash2, History, RefreshCcw, CheckSquare, Square } from "lucide-react";
import "./App.css";

// --- CONFIGURATION ---
// If Vercel settings are tricky, you can paste your Render URL here:
const RENDER_BACKEND_URL = "https://resume-perser-backend-2.onrender.com";

const getApiUrl = () => {
  // If we are on Vercel, ALWAYS force the Render URL as the first priority
  if (window.location.hostname.includes("vercel.app")) {
    return RENDER_BACKEND_URL;
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.includes("127.0.0.1") && !envUrl.includes("localhost")) {
    return envUrl;
  }
  return "http://127.0.0.1:8000";
};

console.log("🚀 LATEST BUILD - Using API:", getApiUrl());

const API_BASE_URL = getApiUrl();

// PROD MODE LOGGING
if (window.location.hostname.includes("vercel.app")) {
  console.log("🔥 PROD MODE ENABLED:", API_BASE_URL);
}

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
  const [history, setHistory] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);

  useEffect(() => {
    console.log("Using API URL:", API_BASE_URL);
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
    const { data, error } = await supabase
      .table("resumes")
      .select("id, filename, file_url, created_at")
      .order("created_at", { ascending: false });

    if (data) setHistory(data);
  };

  const handleDeleteResume = async (id) => {
    if (!window.confirm("Are you sure you want to delete this resume?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE_URL}/resume/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
        setResults(prev => prev.filter(item => item.id !== id));
      } else {
        const errData = await res.json();
        alert("Delete failed: " + (errData.detail || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Server status ${res.status}`);
      }

      const data = await res.json();

      if (resumeId) {
        // Append or replace the individual result in the current results list
        setResults(prev => {
          const others = prev.filter(r => r.id !== data[0]?.id);
          return [...data, ...others];
        });
      } else {
        setResults(data);
      }

      fetchHistory(); // Sync history
    } catch (e) {
      console.error("Matching Error Details:", e);
      alert(`Analysis failed!\nURL: ${API_BASE_URL}/match-resumes\nError: ${e.message}`);
    } finally {
      setAnalyzing(false);
    }
  }, [currentJobId]);

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
            Resume AI <span style={{ fontSize: '0.7rem', opacity: 0.5, border: '1px solid', padding: '2px 6px', borderRadius: '4px', verticalAlign: 'middle' }}>v2.0 PROD</span>
          </h1>
          {session && (
            <button onClick={handleLogout} className="btn-secondary">Logout</button>
          )}
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
                  <UploadResume onUploadSuccess={(id) => runAnalysis(null, id)} apiUrl={API_BASE_URL} />
                </div>
                <div className="glass-panel card">
                  <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <span className="icon-box" style={{ background: 'var(--accent)' }}>💼</span> Job Details
                  </h2>
                  <JobDescription onAnalysisStarted={(id) => runAnalysis(id)} apiUrl={API_BASE_URL} />
                </div>
              </div>

              {/* Ranking Results Section */}
              <div style={{ marginTop: '3rem' }} className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
                    Ranked Candidates {analyzing && <span className="animate-pulse" style={{ fontSize: '1rem', color: 'var(--primary)' }}>Analyzing...</span>}
                  </h2>
                  {currentJobId && (
                    <button className="btn-secondary" onClick={() => runAnalysis(currentJobId)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RefreshCcw size={16} /> Re-analyze All
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {results.length > 0 ? results.map((res, i) => (
                    <div key={res.id || i} className="glass-panel animate-slide-up candidate-card" style={{ borderLeft: `6px solid ${res.eligibility === 'Eligible' ? '#10b981' : '#ef4444'}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                          <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>{res.filename || `Candidate #${i + 1}`}</h3>
                          <span className={`badge ${res.eligibility === 'Eligible' ? 'eligible' : 'not-eligible'}`}>
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
                            <span className="stat-label">Experience</span>
                            <span className="stat-value">{res.details?.years_of_experience || 0} Years</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Role Similarity</span>
                            <span className="stat-value">{Math.round(res.details?.role_similarity) || 0}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="score-container">
                        <div className="score-ring">
                          <svg viewBox="0 0 36 36" className="circular-chart">
                            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="circle" strokeDasharray={`${res.match_score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          </svg>
                          <div className="score-text">
                            <span className="score-number">{Math.round(res.match_score) || 0}</span>
                            <span className="score-percent">%</span>
                          </div>
                        </div>
                        <p className="score-label">Match Score</p>
                      </div>
                    </div>
                  )) : (
                    <div className="glass-panel card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                      <p>Start an analysis to browse top matches.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Resume Library/History Section */}
              <div style={{ marginTop: '5rem' }} className="animate-fade-in">
                <h2 style={{ fontSize: '2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <History size={32} color="var(--primary)" /> Resume Library
                </h2>
                <div className="glass-panel card" style={{ padding: '0' }}>
                  {history.length > 0 ? (
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Filename</th>
                          <th>Added on</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const dedupedHistory = [];
                          const seen = new Set();
                          [...history].forEach(item => {
                            const key = item.filename.strip?.()?.toLowerCase() || item.filename.toLowerCase();
                            if (!seen.has(key)) {
                              seen.add(key);
                              dedupedHistory.push(item);
                            }
                          });
                          return dedupedHistory.map(item => (
                            <tr key={item.id}>
                              <td>{item.filename}</td>
                              <td>{new Date(item.created_at).toLocaleDateString()}</td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button className="btn-secondary btn-sm" onClick={() => runAnalysis(null, item.id)}>Analyze This</button>
                                  <button className="btn-delete" onClick={() => handleDeleteResume(item.id)}><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>Your resume library is empty.</div>
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
