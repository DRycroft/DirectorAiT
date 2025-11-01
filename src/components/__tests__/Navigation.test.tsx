/**
 * Navigation Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navigation } from '../Navigation';

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
    renderNavigation();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should have accessible navigation structure', () => {
    renderNavigation();
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });
});
