import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Send, Search, FileText, Plus, X } from "lucide-react";

export default function JobDescription({ onAnalysisStarted }) {
  const [mode, setMode] = useState("jd"); // jd or keywords
  const [desc, setDesc] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [currentKeyword, setCurrentKeyword] = useState("");
  const [minExp, setMinExp] = useState(0);
  const [loading, setLoading] = useState(false);

  const addKeyword = (e) => {
    e.preventDefault();
    if (currentKeyword && !keywords.includes(currentKeyword)) {
      setKeywords([...keywords, currentKeyword]);
      setCurrentKeyword("");
    }
  };

  const removeKeyword = (kw) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const submit = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session.access_token;
    const jobId = `job_${Date.now()}`;

    try {
      const res = await fetch("http://127.0.0.1:8000/parse-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          job_id: jobId,
          description: mode === "jd" ? desc : null,
          keywords: keywords,
          min_experience: parseInt(minExp) || 0
        })
      });

      if (onAnalysisStarted) onAnalysisStarted(jobId);
    } catch (err) {
      alert("Error saving: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
        <button
          onClick={() => setMode("jd")}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: mode === "jd" ? 'var(--accent)' : 'transparent',
            color: 'white', fontWeight: 600, transition: '0.3s'
          }}>
          <FileText size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Job Description
        </button>
        <button
          onClick={() => setMode("keywords")}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: mode === "keywords" ? 'var(--primary)' : 'transparent',
            color: 'white', fontWeight: 600, transition: '0.3s'
          }}>
          <Search size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Keywords
        </button>
      </div>

      {mode === "jd" ? (
        <textarea
          className="glass-input"
          placeholder="Paste the full job description here..."
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={6}
          style={{ resize: 'vertical', minHeight: '150px' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form onSubmit={addKeyword} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="glass-input"
              placeholder="Add skill (e.g. React, Python)"
              value={currentKeyword}
              onChange={e => setCurrentKeyword(e.target.value)}
            />
            <button type="submit" className="btn-secondary" style={{ padding: '0 15px' }}><Plus size={20} /></button>
          </form>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {keywords.map(kw => (
              <span key={kw} style={{
                background: 'rgba(139, 92, 246, 0.2)', padding: '6px 12px', borderRadius: '20px',
                fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--primary)'
              }}>
                {kw} <X size={14} onClick={() => removeKeyword(kw)} style={{ cursor: 'pointer' }} />
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Min. Experience (Years):</label>
        <input
          type="number"
          className="glass-input"
          style={{ width: '80px' }}
          value={minExp}
          onChange={e => setMinExp(e.target.value)}
        />
      </div>

      <button className="btn-primary" onClick={submit} disabled={loading} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
        {loading ? "Processing..." : "Start Analysis"} <Send size={18} />
      </button>
    </div>
  );
}
