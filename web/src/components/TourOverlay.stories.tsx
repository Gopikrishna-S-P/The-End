import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import TourOverlay from './TourOverlay';
import { tour } from '../utils/tour';

function Started() {
  useEffect(() => {
    tour.start([
      { id: 's1', selector: '#story-tour-target', title: 'Your dashboard', body: 'Everything important starts here.', placement: 'bottom' },
      { id: 's2', selector: '#story-tour-target', title: 'Quick actions', body: 'Use these to move fast.', placement: 'right' },
    ]);
    return () => tour.skip();
  }, []);
  return (
    <div style={{ padding: 80 }}>
      <button id="story-tour-target" className="ds-btn is-primary" style={{ pointerEvents: 'none' }}>
        Tour target
      </button>
      <TourOverlay />
    </div>
  );
}

const meta: Meta<typeof TourOverlay> = {
  title: 'Components/TourOverlay',
  component: TourOverlay,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof TourOverlay>;

export const Default: Story = { render: () => <Started /> };
