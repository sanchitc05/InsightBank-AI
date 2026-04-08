import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import TransactionsPage from './pages/TransactionsPage';
import Insights from './pages/Insights';
import Compare from './pages/Compare';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
