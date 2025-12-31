/**
 * Button 元件測試
 * @module components/ui/__tests__/button.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, buttonVariants } from '../button';

describe('Button', () => {
  describe('rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
    });

    it('should render with children', () => {
      render(
        <Button>
          <span data-testid="child">Child content</span>
        </Button>
      );
      expect(screen.getByTestId('child')).toBeDefined();
    });
  });

  describe('variants', () => {
    it('should apply default variant classes', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-primary');
    });

    it('should apply destructive variant classes', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-destructive');
    });

    it('should apply outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
      expect(button.className).toContain('border-input');
    });

    it('should apply secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-secondary');
    });

    it('should apply ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('hover:bg-accent');
    });

    it('should apply link variant classes', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('underline-offset-4');
    });

    it('should apply success variant classes', () => {
      render(<Button variant="success">Success</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-green-600');
    });

    it('should apply warning variant classes', () => {
      render(<Button variant="warning">Warning</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-yellow-500');
    });
  });

  describe('sizes', () => {
    it('should apply default size classes', () => {
      render(<Button>Default size</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-10');
      expect(button.className).toContain('px-4');
    });

    it('should apply small size classes', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-9');
      expect(button.className).toContain('px-3');
    });

    it('should apply large size classes', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-11');
      expect(button.className).toContain('px-8');
    });

    it('should apply icon size classes', () => {
      render(<Button size="icon">🔧</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-10');
      expect(button.className).toContain('w-10');
    });
  });

  describe('interactions', () => {
    it('should call onClick handler when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should apply disabled styles when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
      expect(button.className).toContain('disabled:opacity-50');
    });
  });

  describe('props', () => {
    it('should pass through native button attributes', () => {
      render(
        <Button type="submit" name="submit-btn">
          Submit
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('type', 'submit');
      expect(button).toHaveProperty('name', 'submit-btn');
    });

    it('should merge custom className with variant classes', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
      expect(button.className).toContain('bg-primary'); // default variant
    });

    it('should forward ref to button element', () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Button ref={ref}>With ref</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('asChild prop', () => {
    it('should render children as the button when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      // When asChild is true, the Button should render as an anchor
      const link = screen.getByRole('link', { name: 'Link Button' });
      expect(link).toBeDefined();
      expect(link.tagName.toLowerCase()).toBe('a');
    });
  });
});

describe('buttonVariants', () => {
  it('should generate default variant classes', () => {
    const classes = buttonVariants();
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('h-10');
  });

  it('should generate variant-specific classes', () => {
    const classes = buttonVariants({ variant: 'destructive' });
    expect(classes).toContain('bg-destructive');
  });

  it('should generate size-specific classes', () => {
    const classes = buttonVariants({ size: 'lg' });
    expect(classes).toContain('h-11');
    expect(classes).toContain('px-8');
  });

  it('should combine variant and size classes', () => {
    const classes = buttonVariants({ variant: 'outline', size: 'sm' });
    expect(classes).toContain('border');
    expect(classes).toContain('h-9');
  });

  it('should include custom className', () => {
    const classes = buttonVariants({ className: 'my-custom-class' });
    expect(classes).toContain('my-custom-class');
  });
});
