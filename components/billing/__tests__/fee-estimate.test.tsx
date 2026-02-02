/**
 * FeeEstimate 元件測試
 * @module components/billing/__tests__/fee-estimate.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeeEstimate } from '../fee-estimate';

describe('FeeEstimate', () => {
  it('should render action type and estimated fee', () => {
    render(
      <FeeEstimate
        actionType="CREATE_CAMPAIGN"
        adSpend={10000}
        commissionRate={0.1}
      />
    );

    expect(screen.getByText(/預估費用/)).toBeDefined();
    // 10000 * 0.1 = 1000
    expect(screen.getByText(/\$1,000/)).toBeDefined();
  });

  it('should display commission percentage', () => {
    render(
      <FeeEstimate
        actionType="UPDATE_BUDGET"
        adSpend={5000}
        commissionRate={0.05}
      />
    );

    expect(screen.getByText(/5%/)).toBeDefined();
  });

  it('should calculate correct fee for 10% commission', () => {
    render(
      <FeeEstimate
        actionType="CREATE_ADSET"
        adSpend={20000}
        commissionRate={0.1}
      />
    );

    // 20000 * 0.1 = 2000
    expect(screen.getByText(/\$2,000/)).toBeDefined();
  });

  it('should calculate correct fee for 5% commission', () => {
    render(
      <FeeEstimate
        actionType="CREATE_AD"
        adSpend={10000}
        commissionRate={0.05}
      />
    );

    // 10000 * 0.05 = 500
    expect(screen.getByText(/\$500/)).toBeDefined();
  });

  it('should calculate correct fee for 3% commission', () => {
    render(
      <FeeEstimate
        actionType="DUPLICATE_CAMPAIGN"
        adSpend={100000}
        commissionRate={0.03}
      />
    );

    // 100000 * 0.03 = 3000
    expect(screen.getByText(/\$3,000/)).toBeDefined();
  });

  it('should show free when action is not billable', () => {
    render(
      <FeeEstimate
        actionType="PAUSE"
        adSpend={10000}
        commissionRate={0.1}
        isBillable={false}
      />
    );

    expect(screen.getByText(/免費/)).toBeDefined();
  });

  it('should show insufficient balance warning when provided', () => {
    render(
      <FeeEstimate
        actionType="CREATE_CAMPAIGN"
        adSpend={10000}
        commissionRate={0.1}
        currentBalance={500}
      />
    );

    // Fee is 1000, balance is 500
    expect(screen.getByText(/餘額不足/)).toBeDefined();
  });

  it('should not show warning when balance is sufficient', () => {
    render(
      <FeeEstimate
        actionType="CREATE_CAMPAIGN"
        adSpend={10000}
        commissionRate={0.1}
        currentBalance={2000}
      />
    );

    // Fee is 1000, balance is 2000
    expect(screen.queryByText(/餘額不足/)).toBeNull();
  });

  it('should show ad spend amount', () => {
    render(
      <FeeEstimate
        actionType="CREATE_CAMPAIGN"
        adSpend={50000}
        commissionRate={0.1}
      />
    );

    expect(screen.getByText(/\$50,000/)).toBeDefined();
  });

  it('should apply compact variant styles', () => {
    render(
      <FeeEstimate
        actionType="CREATE_CAMPAIGN"
        adSpend={10000}
        commissionRate={0.1}
        variant="compact"
        data-testid="fee-estimate"
      />
    );

    const element = screen.getByTestId('fee-estimate');
    expect(element.className).toContain('text-sm');
  });

  it('should apply default variant styles', () => {
    render(
      <FeeEstimate
        actionType="CREATE_CAMPAIGN"
        adSpend={10000}
        commissionRate={0.1}
        variant="default"
        data-testid="fee-estimate"
      />
    );

    const element = screen.getByTestId('fee-estimate');
    expect(element.className).toContain('p-4');
  });
});
