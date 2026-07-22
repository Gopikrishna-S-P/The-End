import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import MfaGate from './MfaGate';

function Cleared({ mfaEnabled }: { mfaEnabled: boolean | undefined }) {
  useEffect(() => { try { localStorage.removeItem('rp-mfa-gate-snoozed-until'); } catch {} }, []);
  return <MfaGate mfaEnabled={mfaEnabled} />;
}

const meta: Meta<typeof MfaGate> = {
  title: 'Components/MfaGate',
  component: MfaGate,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof MfaGate>;

export const MfaDisabled: Story = { render: () => <Cleared mfaEnabled={false} /> };
export const MfaEnabled: Story = { render: () => <Cleared mfaEnabled={true} /> }; // renders nothing
