import { useNavigate } from 'react-router-dom';
import useStatements from '../hooks/useStatements';
import UploadCard from '../components/UploadCard';
import StatementList from '../components/StatementList';

export default function UploadPage() {
  const { statements, loading, refetch } = useStatements();
  const navigate = useNavigate();

  const handleUploadSuccess = (data) => {
    refetch();
    // Auto-navigate to dashboard after 1.5s
    setTimeout(() => navigate('/'), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-extrabold mb-6"
          style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Upload Statement
      </h1>

      <UploadCard onUploadSuccess={handleUploadSuccess} />

      <div className="mt-10">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          📁 Uploaded Statements
        </h2>
        <StatementList statements={statements} loading={loading} onDeleted={refetch} />
      </div>
    </div>
  );
}
