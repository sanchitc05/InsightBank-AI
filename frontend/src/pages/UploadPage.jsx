import { useNavigate } from 'react-router-dom';
import { useStatements } from '../hooks/useStatements';
import PageWrapper from '../components/PageWrapper';
import { useToast } from '../hooks/useToast';
import UploadCard from '../components/UploadCard';
import StatementList from '../components/StatementList';

export default function UploadPage() {
  const { data: statements = [], isLoading: loading } = useStatements();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleUploadSuccess = () => {
    // Basic navigation or additional feedback if needed
    // The mutation in useQueries already shows a success toast
    setTimeout(() => navigate('/'), 1500);
  };

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-extrabold mb-8 tracking-tight">
          <span className="text-gradient">Upload Statement</span>
        </h1>

        <UploadCard onUploadSuccess={handleUploadSuccess} />

        <div className="mt-10">
          <h2 className="text-base font-bold mb-4 uppercase tracking-[0.2em] text-slate-500">
            Uploaded Statements
          </h2>
          <StatementList statements={statements} loading={loading} />
        </div>
      </div>
    </PageWrapper>
  );
}
