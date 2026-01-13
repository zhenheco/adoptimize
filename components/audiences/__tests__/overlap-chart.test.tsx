/**
 * OverlapChart 元件測試
 *
 * A-004: Overlap Analysis
 * AC1: 顯示受眾重疊矩陣圖
 * AC2: 重疊率 > 30% 標記為警示
 * AC3: 點擊查看詳細重疊數據
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { OverlapChart, type OverlapChartProps } from '../overlap-chart';

// 模擬受眾資料
const mockAudiences = [
  { id: 'a1', name: 'High Intent Buyers', size: 50000 },
  { id: 'a2', name: 'Website Visitors', size: 80000 },
  { id: 'a3', name: 'Email Subscribers', size: 30000 },
];

// 模擬重疊資料 - a1-a2: 50%, a1-a3: 35%, a2-a3: 15%
const mockOverlapData = {
  'a1-a2': 25000, // 25000/50000 = 50% (high)
  'a2-a1': 25000,
  'a1-a3': 10500, // 10500/30000 = 35% (high)
  'a3-a1': 10500,
  'a2-a3': 4500, // 4500/30000 = 15% (low)
  'a3-a2': 4500,
};

const defaultProps: OverlapChartProps = {
  audiences: mockAudiences,
  overlapData: mockOverlapData,
};

describe('OverlapChart 基本渲染', () => {
  it('should render the component', () => {
    render(<OverlapChart {...defaultProps} />);
    expect(screen.getByTestId('overlap-chart')).toBeInTheDocument();
  });

  it('should display chart title', () => {
    render(<OverlapChart {...defaultProps} />);
    expect(screen.getByText(/受眾重疊分析/)).toBeInTheDocument();
  });

  it('should render audience labels', () => {
    render(<OverlapChart {...defaultProps} />);
    // 每個受眾名稱會出現兩次（欄標題和列標題）
    expect(screen.getAllByText('High Intent Buyers')).toHaveLength(2);
    expect(screen.getAllByText('Website Visitors')).toHaveLength(2);
    expect(screen.getAllByText('Email Subscribers')).toHaveLength(2);
  });

  it('should render a grid of cells for the matrix', () => {
    render(<OverlapChart {...defaultProps} />);
    // 3x3 matrix = 9 cells
    const cells = screen.getAllByTestId(/^overlap-cell-/);
    expect(cells).toHaveLength(9);
  });

  it('should show loading state', () => {
    render(<OverlapChart {...defaultProps} loading={true} />);
    expect(screen.getByTestId('overlap-chart-loading')).toBeInTheDocument();
  });

  it('should show empty state when no audiences', () => {
    render(<OverlapChart audiences={[]} overlapData={{}} />);
    expect(screen.getByText(/沒有可分析的受眾/)).toBeInTheDocument();
  });
});

describe('OverlapChart 矩陣顯示 (AC1)', () => {
  it('should display overlap percentage in cells', () => {
    render(<OverlapChart {...defaultProps} />);
    // 找到特定的重疊率顯示
    expect(screen.getByTestId('overlap-cell-a1-a2')).toHaveTextContent('50%');
    expect(screen.getByTestId('overlap-cell-a1-a3')).toHaveTextContent('35%');
    expect(screen.getByTestId('overlap-cell-a2-a3')).toHaveTextContent('15%');
  });

  it('should display 100% on diagonal cells (self-overlap)', () => {
    render(<OverlapChart {...defaultProps} />);
    expect(screen.getByTestId('overlap-cell-a1-a1')).toHaveTextContent('100%');
    expect(screen.getByTestId('overlap-cell-a2-a2')).toHaveTextContent('100%');
    expect(screen.getByTestId('overlap-cell-a3-a3')).toHaveTextContent('100%');
  });

  it('should be symmetric (cell[i][j] = cell[j][i])', () => {
    render(<OverlapChart {...defaultProps} />);
    const cell12 = screen.getByTestId('overlap-cell-a1-a2');
    const cell21 = screen.getByTestId('overlap-cell-a2-a1');
    expect(cell12.textContent).toBe(cell21.textContent);
  });
});

describe('OverlapChart 警示標記 (AC2)', () => {
  it('should mark cells with >30% overlap as high (red)', () => {
    render(<OverlapChart {...defaultProps} />);
    const highCell = screen.getByTestId('overlap-cell-a1-a2'); // 50%
    expect(highCell).toHaveClass('overlap-high');
  });

  it('should mark cells with 20-30% overlap as moderate (yellow)', () => {
    // 新增一個中等重疊的測試資料
    const moderateOverlapData = {
      'a1-a2': 12500, // 12500/50000 = 25% (moderate)
      'a2-a1': 12500,
    };
    render(
      <OverlapChart
        audiences={mockAudiences.slice(0, 2)}
        overlapData={moderateOverlapData}
      />
    );
    const cell = screen.getByTestId('overlap-cell-a1-a2');
    expect(cell).toHaveClass('overlap-moderate');
  });

  it('should mark cells with <20% overlap as low (green/normal)', () => {
    render(<OverlapChart {...defaultProps} />);
    const lowCell = screen.getByTestId('overlap-cell-a2-a3'); // 15%
    expect(lowCell).toHaveClass('overlap-low');
  });

  it('should display warning icon for high overlap cells', () => {
    render(<OverlapChart {...defaultProps} />);
    const highCell = screen.getByTestId('overlap-cell-a1-a2');
    expect(within(highCell).getByTestId('warning-icon')).toBeInTheDocument();
  });

  it('should not display warning icon for low overlap cells', () => {
    render(<OverlapChart {...defaultProps} />);
    const lowCell = screen.getByTestId('overlap-cell-a2-a3');
    expect(within(lowCell).queryByTestId('warning-icon')).not.toBeInTheDocument();
  });
});

describe('OverlapChart 詳細資訊 (AC3)', () => {
  it('should show tooltip on cell hover', async () => {
    render(<OverlapChart {...defaultProps} />);
    const cell = screen.getByTestId('overlap-cell-a1-a2');
    fireEvent.mouseEnter(cell);
    expect(await screen.findByTestId('overlap-tooltip')).toBeInTheDocument();
  });

  it('should display audience names in tooltip', async () => {
    render(<OverlapChart {...defaultProps} />);
    const cell = screen.getByTestId('overlap-cell-a1-a2');
    fireEvent.mouseEnter(cell);
    const tooltip = await screen.findByTestId('overlap-tooltip');
    expect(tooltip).toHaveTextContent('High Intent Buyers');
    expect(tooltip).toHaveTextContent('Website Visitors');
  });

  it('should display overlap count in tooltip', async () => {
    render(<OverlapChart {...defaultProps} />);
    const cell = screen.getByTestId('overlap-cell-a1-a2');
    fireEvent.mouseEnter(cell);
    const tooltip = await screen.findByTestId('overlap-tooltip');
    expect(tooltip).toHaveTextContent('25,000'); // 重疊人數
  });

  it('should display suggestion in tooltip for high overlap', async () => {
    render(<OverlapChart {...defaultProps} />);
    const cell = screen.getByTestId('overlap-cell-a1-a2');
    fireEvent.mouseEnter(cell);
    const tooltip = await screen.findByTestId('overlap-tooltip');
    expect(tooltip).toHaveTextContent(/排除/); // 建議排除
  });

  it('should hide tooltip on mouse leave', async () => {
    render(<OverlapChart {...defaultProps} />);
    const cell = screen.getByTestId('overlap-cell-a1-a2');
    fireEvent.mouseEnter(cell);
    await screen.findByTestId('overlap-tooltip');
    fireEvent.mouseLeave(cell);
    expect(screen.queryByTestId('overlap-tooltip')).not.toBeInTheDocument();
  });

  it('should call onCellClick when cell is clicked', () => {
    const handleClick = vi.fn();
    render(<OverlapChart {...defaultProps} onCellClick={handleClick} />);
    const cell = screen.getByTestId('overlap-cell-a1-a2');
    fireEvent.click(cell);
    expect(handleClick).toHaveBeenCalledWith(
      expect.objectContaining({
        audience1: mockAudiences[0],
        audience2: mockAudiences[1],
      })
    );
  });
});

describe('OverlapChart 高風險配對列表', () => {
  it('should display high-risk pairs section', () => {
    render(<OverlapChart {...defaultProps} />);
    expect(screen.getByTestId('high-risk-pairs')).toBeInTheDocument();
  });

  it('should list pairs with >30% overlap', () => {
    render(<OverlapChart {...defaultProps} />);
    const riskList = screen.getByTestId('high-risk-pairs');
    // "High Intent Buyers" 會出現在兩個高風險配對中（vs Website Visitors 和 vs Email Subscribers）
    const highIntentMatches = within(riskList).getAllByText(/High Intent Buyers/);
    expect(highIntentMatches.length).toBeGreaterThanOrEqual(1);
    expect(within(riskList).getByText(/50%/)).toBeInTheDocument();
  });

  it('should sort pairs by overlap percentage descending', () => {
    render(<OverlapChart {...defaultProps} />);
    const riskItems = screen.getAllByTestId(/^risk-pair-/);
    // a1-a2 (50%) should be first, a1-a3 (35%) should be second
    expect(riskItems[0]).toHaveTextContent('50%');
    expect(riskItems[1]).toHaveTextContent('35%');
  });

  it('should show "No high-risk pairs" when none exist', () => {
    const lowOverlapData = {
      'a1-a2': 2500, // 5%
      'a2-a1': 2500,
    };
    render(
      <OverlapChart
        audiences={mockAudiences.slice(0, 2)}
        overlapData={lowOverlapData}
      />
    );
    expect(screen.getByText(/沒有高風險的重疊/)).toBeInTheDocument();
  });
});

describe('OverlapChart 色彩映射', () => {
  it('should use gradient colors based on overlap percentage', () => {
    render(<OverlapChart {...defaultProps} />);
    const cell100 = screen.getByTestId('overlap-cell-a1-a1'); // 100%
    const cell50 = screen.getByTestId('overlap-cell-a1-a2'); // 50%
    const cell15 = screen.getByTestId('overlap-cell-a2-a3'); // 15%

    // 檢查背景顏色深淺（透過 style 或 class）
    expect(cell100).toHaveAttribute('data-intensity', 'very-high');
    expect(cell50).toHaveAttribute('data-intensity', 'high');
    expect(cell15).toHaveAttribute('data-intensity', 'low');
  });
});

describe('OverlapChart 響應式設計', () => {
  it('should have compact mode for mobile', () => {
    render(<OverlapChart {...defaultProps} compact={true} />);
    expect(screen.getByTestId('overlap-chart')).toHaveClass('compact');
  });

  it('should truncate long audience names in compact mode', () => {
    const longNameAudiences = [
      { id: 'a1', name: 'Very Long Audience Name That Should Be Truncated', size: 1000 },
      { id: 'a2', name: 'Another Long Name', size: 1000 },
    ];
    render(
      <OverlapChart
        audiences={longNameAudiences}
        overlapData={{}}
        compact={true}
      />
    );
    // 檢查 title 屬性用於完整名稱（名稱會出現兩次：欄標題和列標題）
    const labels = screen.getAllByText(/Very Long/);
    expect(labels[0]).toHaveAttribute('title', 'Very Long Audience Name That Should Be Truncated');
  });
});
