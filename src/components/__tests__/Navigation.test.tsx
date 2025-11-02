/**
 * Navigation Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../Navigation';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('Navigation Component', () => {
  const renderNavigation = () => {
    return render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );
  };

  it('should render navigation component', () => {
    const { container } = renderNavigation();
    expect(container.querySelector('nav')).toBeInTheDocument();
  });

  it('should have accessible navigation structure', () => {
    const { container } = renderNavigation();
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
  });
});
