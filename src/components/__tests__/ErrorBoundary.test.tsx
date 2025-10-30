import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ThrowError = ({ error }: { error?: boolean }) => {
  if (error) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when child throws', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError error={true} />
      </ErrorBoundary>
    );
    
    expect(getByText('Something went wrong')).toBeInTheDocument();
    expect(getByText(/An unexpected error occurred/)).toBeInTheDocument();
    
    spy.mockRestore();
  });

  it('should render custom fallback when provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { getByText } = render(
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        <ThrowError error={true} />
      </ErrorBoundary>
    );
    
    expect(getByText('Custom error message')).toBeInTheDocument();
    
    spy.mockRestore();
  });
});
