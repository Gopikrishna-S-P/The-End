import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ConfettiHost from './ConfettiHost';
import { confetti } from '../utils/confetti';

function Fire() {
  useEffect(() => { confetti.fire({ origin: { x: 300, y: 200 } }); }, []);
  return <ConfettiHost />;
}

const meta: Meta<typeof ConfettiHost> = {
  title: 'Components/ConfettiHost',
  component: ConfettiHost,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ConfettiHost>;

export const Burst: Story = { render: () => <Fire /> };
