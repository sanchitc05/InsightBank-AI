import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import Dashboard from '../pages/Dashboard';
import { useStatements } from '../hooks/useStatements';
import { useDashboardSummary, useCategoryBreakdown, useMonthlyTrends } from '../hooks/useAnalytics';
import { useDashboardTransactions } from '../hooks/useTransactions';

vi.mock('../hooks/useStatements', () => ({
  useStatements: vi.fn(),
}));

vi.mock('../hooks/useAnalytics', () => ({
  useDashboardSummary: vi.fn(),
  useCategoryBreakdown: vi.fn(),
  useMonthlyTrends: vi.fn(),
}));

vi.mock('../hooks/useTransactions', () => ({
  useDashboardTransactions: vi.fn(),
}));

vi.mock('../components/PageWrapper', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../components/ScrollReveal', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../components/Skeleton', () => ({
  SkeletonBox: ({ height }) => <div data-testid="skeleton" style={{ height }} />,
}));

vi.mock('../charts/IncomeExpenseBar', () => ({
  default: () => <div>IncomeExpenseBar</div>,
}));

vi.mock('../charts/CategoryPie', () => ({
  default: () => <div>CategoryPie</div>,
}));

vi.mock('../charts/BalanceLine', () => ({
  default: () => <div>BalanceLine</div>,
}));

vi.mock('../charts/SpendHeatmap', () => ({
  default: () => <div>SpendHeatmap</div>,
}));

const allTimeSummary = {
  period: 'all-time',
  total_income: 9000,
  total_expense: 2000,
  savings: 7000,
  savings_rate: 77.8,
  top_category: 'Rent',
  daily_avg_spend: 32.79,
};

const marchSummary = {
  period: '2026-03',
  total_income: 5000,
  total_expense: 1500,
  savings: 3500,
  savings_rate: 70.0,
  top_category: 'Rent',
  daily_avg_spend: 48.39,
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useStatements.mockReturnValue({
      data: [
        { id: 11, month: 3, year: 2026, status: 'SUCCESS' },
        { id: 12, month: 2, year: 2026, status: 'SUCCESS' },
      ],
      isLoading: false,
    });

    useDashboardSummary.mockImplementation((selectedMonth) => ({
      data: selectedMonth === '2026-03' ? marchSummary : allTimeSummary,
      isLoading: false,
    }));

    useCategoryBreakdown.mockImplementation((selectedMonth) => ({
      data: { period: selectedMonth || 'all-time', data: [] },
      isLoading: false,
    }));

    useMonthlyTrends.mockImplementation((selectedMonth) => ({
      data: { period: selectedMonth || 'all-time', data: [] },
      isLoading: false,
    }));

    useDashboardTransactions.mockImplementation(() => ({
      data: { data: [] },
      isLoading: false,
    }));
  });

  it('defaults to All and switches queries when a month tab is selected', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mar 2026' })).toBeInTheDocument();
    expect(screen.getByText('All-time Savings Rate')).toBeInTheDocument();

    await waitFor(() => {
      expect(useDashboardSummary).toHaveBeenCalledWith(null);
      expect(useMonthlyTrends).toHaveBeenCalledWith(null);
      expect(useDashboardTransactions).toHaveBeenCalledWith(null);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mar 2026' }));

    await waitFor(() => {
      expect(useDashboardSummary).toHaveBeenCalledWith('2026-03');
      expect(useMonthlyTrends).toHaveBeenCalledWith('2026-03');
      expect(useDashboardTransactions).toHaveBeenCalledWith('2026-03');
    });

    expect(screen.getByText('70.0% Savings Rate')).toBeInTheDocument();
  });
});
