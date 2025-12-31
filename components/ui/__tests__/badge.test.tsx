/**
 * Badge 元件測試
 * @module components/ui/__tests__/badge.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from '../badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>Status</Badge>);
      expect(screen.getByText('Status')).toBeDefined();
    });

    it('should render as div element', () => {
      render(<Badge data-testid="badge">Status</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.tagName.toLowerCase()).toBe('div');
    });

    it('should apply base styling classes', () => {
      render(<Badge data-testid="badge">Status</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('inline-flex');
      expect(badge.className).toContain('items-center');
      expect(badge.className).toContain('rounded-full');
      expect(badge.className).toContain('text-xs');
      expect(badge.className).toContain('font-semibold');
    });

    it('should apply padding classes', () => {
      render(<Badge data-testid="badge">Status</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('px-2.5');
      expect(badge.className).toContain('py-0.5');
    });
  });

  describe('variants', () => {
    it('should apply default variant classes', () => {
      render(<Badge data-testid="badge">Default</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-primary');
    });

    it('should apply secondary variant classes', () => {
      render(
        <Badge data-testid="badge" variant="secondary">
          Secondary
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-secondary');
    });

    it('should apply destructive variant classes', () => {
      render(
        <Badge data-testid="badge" variant="destructive">
          Destructive
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-destructive');
    });

    it('should apply outline variant classes', () => {
      render(
        <Badge data-testid="badge" variant="outline">
          Outline
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('text-foreground');
      // Outline should not have bg-* class
      expect(badge.className).not.toContain('bg-primary');
    });

    it('should apply success variant classes', () => {
      render(
        <Badge data-testid="badge" variant="success">
          Success
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-800');
    });

    it('should apply warning variant classes', () => {
      render(
        <Badge data-testid="badge" variant="warning">
          Warning
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-yellow-100');
      expect(badge.className).toContain('text-yellow-800');
    });

    it('should apply danger variant classes', () => {
      render(
        <Badge data-testid="badge" variant="danger">
          Danger
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('text-red-800');
    });
  });

  describe('dark mode', () => {
    it('should include dark mode classes for success variant', () => {
      render(
        <Badge data-testid="badge" variant="success">
          Success
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('dark:bg-green-900/50');
      expect(badge.className).toContain('dark:text-green-300');
    });

    it('should include dark mode classes for warning variant', () => {
      render(
        <Badge data-testid="badge" variant="warning">
          Warning
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('dark:bg-yellow-900/50');
      expect(badge.className).toContain('dark:text-yellow-300');
    });

    it('should include dark mode classes for danger variant', () => {
      render(
        <Badge data-testid="badge" variant="danger">
          Danger
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('dark:bg-red-900/50');
      expect(badge.className).toContain('dark:text-red-300');
    });
  });

  describe('props', () => {
    it('should merge custom className', () => {
      render(
        <Badge data-testid="badge" className="custom-class">
          Custom
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('custom-class');
      expect(badge.className).toContain('rounded-full');
    });

    it('should pass through native div attributes', () => {
      render(
        <Badge data-testid="badge" id="my-badge" role="status">
          Status
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.id).toBe('my-badge');
      expect(badge.getAttribute('role')).toBe('status');
    });

    it('should handle onClick', () => {
      let clicked = false;
      render(
        <Badge data-testid="badge" onClick={() => (clicked = true)}>
          Clickable
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      badge.click();
      expect(clicked).toBe(true);
    });
  });

  describe('focus styles', () => {
    it('should include focus ring classes', () => {
      render(<Badge data-testid="badge">Focus</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('focus:outline-none');
      expect(badge.className).toContain('focus:ring-2');
      expect(badge.className).toContain('focus:ring-ring');
      expect(badge.className).toContain('focus:ring-offset-2');
    });
  });

  describe('transition', () => {
    it('should include transition classes', () => {
      render(<Badge data-testid="badge">Transition</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('transition-colors');
    });
  });
});

describe('badgeVariants', () => {
  it('should generate default variant classes', () => {
    const classes = badgeVariants();
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('rounded-full');
  });

  it('should generate success variant classes', () => {
    const classes = badgeVariants({ variant: 'success' });
    expect(classes).toContain('bg-green-100');
    expect(classes).toContain('text-green-800');
  });

  it('should generate warning variant classes', () => {
    const classes = badgeVariants({ variant: 'warning' });
    expect(classes).toContain('bg-yellow-100');
    expect(classes).toContain('text-yellow-800');
  });

  it('should generate danger variant classes', () => {
    const classes = badgeVariants({ variant: 'danger' });
    expect(classes).toContain('bg-red-100');
    expect(classes).toContain('text-red-800');
  });

  it('should include custom className', () => {
    const classes = badgeVariants({ className: 'my-custom-class' });
    expect(classes).toContain('my-custom-class');
  });
});
