import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
        if (!result.error) {
          alert("Signup successful! Please check your email for verification.");
        }
      }

      if (result?.error) {
        alert("Authentication Error: " + result.error.message);
      } else if (result?.data?.session) {
        navigate("/");
      }
    } catch (err) {
      alert("An unexpected error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="glass-panel auth-card">
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div className="animate-float" style={{
            display: "inline-block",
            background: "linear-gradient(135deg, var(--primary), var(--indigo), var(--accent))",
            padding: "16px",
            borderRadius: "22px",
            marginBottom: "1rem",
            boxShadow: "0 10px 25px -5px rgba(139, 92, 246, 0.4)"
          }}>
            <ShieldCheck size={36} color="white" />
          </div>
          <h2 style={{ fontSize: "2.2rem", marginBottom: "0.5rem" }}>{isLogin ? "Welcome Back" : "Join Spectral"}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: '1rem' }}>{isLogin ? "Enter your email for access" : "Create an account for resume analysis"}</p>
        </div>

        <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--secondary)', marginLeft: '4px' }}>Email Address</label>
            <div style={{ position: "relative" }}>
              <Mail size={20} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                className="glass-input"
                placeholder="name@example.com"
                style={{ paddingLeft: "48px" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginLeft: '4px' }}>Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={20} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="password"
                className="glass-input"
                placeholder="••••••••"
                style={{ paddingLeft: "48px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: '0.5rem' }}>
            {loading ? "Processing..." : (isLogin ? "Access Dashboard" : "Register Account")} <ArrowRight size={20} />
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', marginLeft: '8px' }}
            >
              {isLogin ? "Create Account" : "Sign In"}
            </button>
          </p>
        </div>

        <div style={{ marginTop: '3rem', textAlign: 'center', opacity: 0.5 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            Powered by Spectral AI Engine • 2026
          </p>
        </div>
      </div>
    </div>
  );
}
