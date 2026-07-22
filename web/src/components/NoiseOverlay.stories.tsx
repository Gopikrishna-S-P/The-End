import type { Meta, StoryObj } from '@storybook/react-vite';
import NoiseOverlay from './NoiseOverlay';

const meta: Meta<typeof NoiseOverlay> = {
  title: 'Components/NoiseOverlay',
  component: NoiseOverlay,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof NoiseOverlay>;

export const Default: Story = {
  render: () => (
    <div style={{ position: 'relative', height: '100vh', background: 'var(--bg-canvas)' }}>
      <NoiseOverlay />
    </div>
  ),
};
