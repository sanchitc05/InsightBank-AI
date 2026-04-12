import { useNavigate } from 'react-router-dom';
import { useStatements } from '../hooks/useStatements';
import PageWrapper from '../components/PageWrapper';
import UploadCard from '../components/UploadCard';
import StatementList from '../components/StatementList';
import ScrollReveal from '../components/ScrollReveal';

export default function UploadPage() {
  const { data: statements = [], isLoading: loading } = useStatements();
  const navigate = useNavigate();

  const handleUploadSuccess = () => {
    // Basic navigation or additional feedback if needed
    // The mutation in useQueries already shows a success toast
    setTimeout(() => navigate('/'), 1500);
  };

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScrollReveal>
          <h1 className="text-4xl font-black mb-8">
            <span className="text-gradient">Upload Statement</span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <UploadCard onUploadSuccess={handleUploadSuccess} />
        </ScrollReveal>

        <div className="mt-16">
          <ScrollReveal delay={200}>
            <h2 className="text-sm font-bold mb-6 uppercase tracking-[0.3em] text-slate-500">
              Processing History
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <StatementList statements={statements} loading={loading} />
          </ScrollReveal>
        </div>

      </div>
    </PageWrapper>
  );
}
