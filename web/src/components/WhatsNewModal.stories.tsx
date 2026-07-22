import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import WhatsNewModal from './WhatsNewModal';

function FreshVisit() {
  useEffect(() => { try { localStorage.removeItem('rp-last-seen-version'); } catch {} }, []);
  return <WhatsNewModal />;
}

const meta: Meta<typeof WhatsNewModal> = {
  title: 'Components/WhatsNewModal',
  component: WhatsNewModal,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof WhatsNewModal>;

export const Default: Story = { render: () => <FreshVisit /> };
