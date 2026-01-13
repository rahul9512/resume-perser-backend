import { supabase } from "../supabaseClient";
import { UploadCloud, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function UploadResume() {
  const [status, setStatus] = useState("idle"); // idle, uploading, success, error

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 25MB limit check
    if (file.size > 25 * 1024 * 1024) {
      alert("File is too large. Max size is 25MB.");
      return;
    }

    setStatus("uploading");
    const { data } = await supabase.auth.getSession();
    const token = data.session.access_token;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload-resume", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const result = await res.json();
      if (res.ok) {
        setStatus("success");
      } else {
        const errorMsg = result.detail || JSON.stringify(result);
        alert("Upload Failed: " + errorMsg);
        setStatus("error");
        console.error("Backend Error:", result);
      }
    } catch (err) {
      alert("Network or Connection Error: " + err.message);
      setStatus("error");
    }
  };

  return (
    <div>
      <label className="upload-zone" style={{ display: 'block' }}>
        <input type="file" onChange={upload} style={{ display: 'none' }} accept=".pdf" />

        {status === "uploading" ? (
          <div className="animate-float"><UploadCloud size={64} color="var(--accent)" /></div>
        ) : status === "success" ? (
          <CheckCircle size={64} color="#10b981" />
        ) : (
          <UploadCloud size={64} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
        )}

        <p style={{ margin: '1rem 0 0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          {status === "uploading" ? "Uploading..." : status === "success" ? "Upload Complete!" : "Click to upload resume"}
        </p>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>PDF files only, max 25MB</p>
      </label>
    </div>
  );
}
