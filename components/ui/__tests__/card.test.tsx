/**
 * Card 元件測試
 * @module components/ui/__tests__/card.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../card';

describe('Card', () => {
  it('should render card with content', () => {
    render(<Card data-testid="card">Card content</Card>);
    expect(screen.getByTestId('card')).toBeDefined();
    expect(screen.getByText('Card content')).toBeDefined();
  });

  it('should apply default styling classes', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-lg');
    expect(card.className).toContain('border');
    expect(card.className).toContain('bg-white');
    expect(card.className).toContain('shadow-sm');
  });

  it('should merge custom className', () => {
    render(
      <Card data-testid="card" className="custom-class">
        Content
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card.className).toContain('custom-class');
    expect(card.className).toContain('rounded-lg');
  });

  it('should include dark mode classes', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('dark:border-gray-800');
    expect(card.className).toContain('dark:bg-gray-950');
  });

  it('should forward ref', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Card ref={ref}>Content</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should pass through native div attributes', () => {
    render(
      <Card data-testid="card" id="my-card" role="region">
        Content
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card.id).toBe('my-card');
    expect(card.getAttribute('role')).toBe('region');
  });
});

describe('CardHeader', () => {
  it('should render header content', () => {
    render(<CardHeader data-testid="header">Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeDefined();
  });

  it('should apply spacing classes', () => {
    render(<CardHeader data-testid="header">Header</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header.className).toContain('flex');
    expect(header.className).toContain('flex-col');
    expect(header.className).toContain('space-y-1.5');
    expect(header.className).toContain('p-6');
  });

  it('should merge custom className', () => {
    render(
      <CardHeader data-testid="header" className="custom-header">
        Header
      </CardHeader>
    );
    const header = screen.getByTestId('header');
    expect(header.className).toContain('custom-header');
  });

  it('should forward ref', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<CardHeader ref={ref}>Header</CardHeader>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardTitle', () => {
  it('should render as h3 element', () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toBeDefined();
    expect(title.textContent).toBe('Title');
  });

  it('should apply text styling classes', () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    const title = screen.getByTestId('title');
    expect(title.className).toContain('text-2xl');
    expect(title.className).toContain('font-semibold');
    expect(title.className).toContain('leading-none');
    expect(title.className).toContain('tracking-tight');
  });

  it('should merge custom className', () => {
    render(
      <CardTitle data-testid="title" className="custom-title">
        Title
      </CardTitle>
    );
    const title = screen.getByTestId('title');
    expect(title.className).toContain('custom-title');
  });

  it('should forward ref', () => {
    const ref = { current: null as HTMLParagraphElement | null };
    render(<CardTitle ref={ref}>Title</CardTitle>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe('CardDescription', () => {
  it('should render as p element', () => {
    render(<CardDescription>Description</CardDescription>);
    expect(screen.getByText('Description').tagName.toLowerCase()).toBe('p');
  });

  it('should apply muted text styling', () => {
    render(
      <CardDescription data-testid="desc">Description</CardDescription>
    );
    const desc = screen.getByTestId('desc');
    expect(desc.className).toContain('text-sm');
    expect(desc.className).toContain('text-gray-500');
  });

  it('should include dark mode classes', () => {
    render(
      <CardDescription data-testid="desc">Description</CardDescription>
    );
    const desc = screen.getByTestId('desc');
    expect(desc.className).toContain('dark:text-gray-400');
  });

  it('should merge custom className', () => {
    render(
      <CardDescription data-testid="desc" className="custom-desc">
        Description
      </CardDescription>
    );
    const desc = screen.getByTestId('desc');
    expect(desc.className).toContain('custom-desc');
  });

  it('should forward ref', () => {
    const ref = { current: null as HTMLParagraphElement | null };
    render(<CardDescription ref={ref}>Description</CardDescription>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe('CardContent', () => {
  it('should render content', () => {
    render(<CardContent data-testid="content">Content here</CardContent>);
    expect(screen.getByText('Content here')).toBeDefined();
  });

  it('should apply padding classes', () => {
    render(<CardContent data-testid="content">Content</CardContent>);
    const content = screen.getByTestId('content');
    expect(content.className).toContain('p-6');
    expect(content.className).toContain('pt-0');
  });

  it('should merge custom className', () => {
    render(
      <CardContent data-testid="content" className="custom-content">
        Content
      </CardContent>
    );
    const content = screen.getByTestId('content');
    expect(content.className).toContain('custom-content');
  });

  it('should forward ref', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<CardContent ref={ref}>Content</CardContent>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardFooter', () => {
  it('should render footer content', () => {
    render(<CardFooter data-testid="footer">Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeDefined();
  });

  it('should apply flex layout and padding', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('flex');
    expect(footer.className).toContain('items-center');
    expect(footer.className).toContain('p-6');
    expect(footer.className).toContain('pt-0');
  });

  it('should merge custom className', () => {
    render(
      <CardFooter data-testid="footer" className="custom-footer">
        Footer
      </CardFooter>
    );
    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('custom-footer');
  });

  it('should forward ref', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<CardFooter ref={ref}>Footer</CardFooter>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('Card composition', () => {
  it('should compose all card parts together', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Card Title' })).toBeDefined();
    expect(screen.getByText('Card Description')).toBeDefined();
    expect(screen.getByText('Card content goes here')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Action' })).toBeDefined();
  });

  it('should render card without header or footer', () => {
    render(
      <Card data-testid="card">
        <CardContent>Only content</CardContent>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeDefined();
    expect(screen.getByText('Only content')).toBeDefined();
  });

  it('should render card with just header', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Just a title</CardTitle>
        </CardHeader>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeDefined();
    expect(screen.getByText('Just a title')).toBeDefined();
  });
});
