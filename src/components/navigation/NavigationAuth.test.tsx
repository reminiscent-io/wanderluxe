import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NavigationAuth from './NavigationAuth';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('./UserAvatar', () => ({ default: () => <div data-testid="user-avatar" /> }));

const auth = vi.hoisted(() => ({ session: null as object | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

describe('NavigationAuth (signed in)', () => {
  beforeEach(() => {
    auth.session = { user: { id: 'user-1' } };
    navigate.mockClear();
  });

  it('renders a mobile create-trip button that navigates to /create-trip', () => {
    render(<NavigationAuth />);
    const mobileButton = screen.getByRole('button', { name: 'Create trip' });
    // Icon button is the mobile counterpart of the labeled desktop button:
    // shown below md, hidden at md+ where the labeled button takes over.
    expect(mobileButton.className).toContain('md:hidden');
    fireEvent.click(mobileButton);
    expect(navigate).toHaveBeenCalledWith('/create-trip');
  });

  it('keeps the labeled desktop button hidden below md', () => {
    render(<NavigationAuth />);
    const desktopButton = screen.getByRole('button', { name: 'Create Trip' });
    expect(desktopButton.className).toContain('hidden');
    expect(desktopButton.className).toContain('md:inline-block');
  });
});

describe('NavigationAuth (signed out)', () => {
  beforeEach(() => {
    auth.session = null;
    navigate.mockClear();
  });

  it('shows no create-trip controls', () => {
    render(<NavigationAuth />);
    expect(screen.queryByRole('button', { name: 'Create trip' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Trip' })).not.toBeInTheDocument();
  });
});
