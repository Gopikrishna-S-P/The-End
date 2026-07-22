import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import SubscriptionBanner from './SubscriptionBanner';
import { AuthProvider } from '../AuthContext';
import { setAccessToken, setRefreshToken, setUserCache } from '../api/axiosInstance';

// SubscriptionBanner reads everything from useSubscription() / useAuth() —
// it takes no props. To render it here we (1) seed a fake logged-in session
// so AuthProvider's bootstrap finds a cached user instead of bouncing to
// /login, and (2) mock the two network calls it makes (auth/me, subscription)
// with MSW instead of hitting a real backend.
const FAKE_USER = {
  id: 'story-user-1',
  email: 'demo@recoverpro.in',
  firstName: 'Demo',
  lastName: 'User',
  enabled: true,
  accountLocked: false,
  mfaEnabled: false,
  organizationId: 'story-org-1',
  createdAt: new Date().toISOString(),
  roles: [{
    id: 'r1', name: 'ROLE_ORG_ADMIN', description: '',
    organizationId: 'story-org-1', organizationName: null,
    systemRole: false, permissions: [],
  }],
};

setAccessToken('storybook-fake-access-token');
setRefreshToken('storybook-fake-refresh-token');
setUserCache(FAKE_USER);

const meHandler = http.get('/api/v1/auth/me', () =>
  HttpResponse.json({ success: true, data: FAKE_USER }));

const subscriptionHandler = (data: Record<string, unknown>) =>
  http.get('/api/v1/subscription', () => HttpResponse.json({ success: true, data }));

const meta: Meta<typeof SubscriptionBanner> = {
  title: 'Components/SubscriptionBanner',
  component: SubscriptionBanner,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <AuthProvider>
          <Story />
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof SubscriptionBanner>;

/** Renders the full-screen blocking wall: subscription has lapsed. */
export const Expired: Story = {
  parameters: {
    msw: {
      handlers: [
        meHandler,
        subscriptionHandler({
          status: 'CANCELLED', plan: 'GROWTH',
          hasActiveSubscription: false, hasStripeCustomer: true, trialDaysLeft: 0,
        }),
      ],
    },
  },
};

/** Renders the wall in its "payment failed" copy variant. */
export const PastDue: Story = {
  parameters: {
    msw: {
      handlers: [
        meHandler,
        subscriptionHandler({
          status: 'PAST_DUE', plan: 'GROWTH',
          hasActiveSubscription: false, hasStripeCustomer: true, trialDaysLeft: 0,
        }),
      ],
    },
  },
};

/** Renders the slim top-of-page trial banner (trialDaysLeft <= 7). */
export const TrialEndingSoon: Story = {
  parameters: {
    msw: {
      handlers: [
        meHandler,
        subscriptionHandler({
          status: 'TRIAL', plan: 'STARTER',
          hasActiveSubscription: true, hasStripeCustomer: false, trialDaysLeft: 3,
        }),
      ],
    },
  },
};

/** Active, healthy subscription — component renders nothing. */
export const Active: Story = {
  parameters: {
    msw: {
      handlers: [
        meHandler,
        subscriptionHandler({
          status: 'ACTIVE', plan: 'GROWTH',
          hasActiveSubscription: true, hasStripeCustomer: true, trialDaysLeft: 0,
        }),
      ],
    },
  },
};
