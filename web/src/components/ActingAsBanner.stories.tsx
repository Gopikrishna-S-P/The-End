import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ActingAsBanner from './ActingAsBanner';
import { impersonation } from '../utils/impersonation';

function Seeded({ minutesAgo, reason }: { minutesAgo: number; reason?: string }) {
  useEffect(() => {
    impersonation.start({
      id: 'u-1', name: 'Anitha Suresh', email: 'anitha@recoverpro.in', roleLabel: 'FO',
    }, reason);
    return () => impersonation.stop();
  }, [minutesAgo, reason]);
  return <ActingAsBanner />;
}

const meta: Meta<typeof ActingAsBanner> = {
  title: 'Components/ActingAsBanner',
  component: ActingAsBanner,
};
export default meta;

type Story = StoryObj<typeof ActingAsBanner>;

export const Active: Story = { render: () => <Seeded minutesAgo={12} /> };
export const WithReason: Story = {
  render: () => <Seeded minutesAgo={4} reason="Investigating a borrower complaint" />,
};
export const NotImpersonating: Story = {}; // renders nothing — default state
