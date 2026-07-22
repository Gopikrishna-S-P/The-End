import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import SessionExpiryChip from './SessionExpiryChip';
import { session } from '../utils/session';

// The chip only renders once remainingMs drops under 5 minutes, driven by
// the `session` singleton — seed an expiry before mount.
function Seeded({ msFromNow }: { msFromNow: number }) {
  useEffect(() => {
    session.setExpiresAt(new Date(Date.now() + msFromNow).toISOString());
    return () => session.clear();
  }, [msFromNow]);
  return <SessionExpiryChip onLogout={fn()} onExtend={fn()} />;
}

const meta: Meta<typeof SessionExpiryChip> = {
  title: 'Components/SessionExpiryChip',
  component: SessionExpiryChip,
};
export default meta;

type Story = StoryObj<typeof SessionExpiryChip>;

export const Warning: Story = { render: () => <Seeded msFromNow={4 * 60_000} /> };
export const Danger: Story = { render: () => <Seeded msFromNow={45_000} /> };
export const Expired: Story = { render: () => <Seeded msFromNow={-5000} /> };
export const NotShown: Story = {}; // no expiry seeded — component renders nothing
