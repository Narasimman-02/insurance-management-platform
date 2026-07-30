import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Documents() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "agent";
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("customer_id") || "";

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("identity");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    if (!customerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/documents", { params: { customer_id: customerId } });
      setDocuments(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function handleUpload(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("customer_id", customerId);
      formData.append("category", category);
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFile(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc) {
    const response = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", doc.file_name);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function handleDelete(id) {
    await api.delete(`/documents/${id}`);
    load();
  }

  if (!customerId) {
    return (
      <div>
        <p className="label-eyebrow text-brass">Module 05</p>
        <h1 className="font-display text-3xl font-semibold mt-1 mb-4">Documents</h1>
        <p className="text-muted">
          Open this page from a customer's record —{" "}
          <Link to="/customers" className="underline underline-offset-2">go to Customers</Link>{" "}
          and click "View documents" (or add <code>?customer_id=1</code> to the URL for testing).
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="label-eyebrow text-brass">Module 05</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Documents</h1>
        <p className="text-sm text-muted mt-1">
          Customer #{customerId} ·{" "}
          <Link to="/customers" className="underline underline-offset-2">back to customers</Link>
        </p>
      </div>

      <form onSubmit={handleUpload} className="card p-6 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        {error && <p className="sm:col-span-3 text-sm text-danger">{error}</p>}
        <div>
          <label className="label-eyebrow block mb-1">File</label>
          <input
            type="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            className="input-field"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
        <div>
          <label className="label-eyebrow block mb-1">Category</label>
          <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="identity">Identity</option>
            <option value="policy">Policy</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <button type="submit" disabled={uploading} className="btn-primary w-full">
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[400px] text-sm">
          <thead>
            <tr className="border-b border-border text-left label-eyebrow">
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" className="px-4 py-6 text-center text-muted">Loading...</td></tr>
            ) : documents.length === 0 ? (
              <tr><td colSpan="3" className="px-4 py-6 text-center text-muted">No documents uploaded yet.</td></tr>
            ) : (
              documents.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs break-all">{d.file_name}</td>
                  <td className="px-4 py-3 text-muted">{d.uploaded_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => handleDownload(d)} className="btn-secondary text-xs mr-2">Download</button>
                    {canManage && (
                      <button onClick={() => handleDelete(d.id)} className="btn-danger text-xs">Delete</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
