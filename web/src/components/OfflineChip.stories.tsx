import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import OfflineChip from './OfflineChip';

// The component reads navigator.onLine and listens for online/offline window
// events; it renders nothing while online. We flip the browser's reported
// state and dispatch the event it listens for so the "offline" story
// actually shows something.
function ForceOffline() {
  useEffect(() => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));
    return () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    };
  }, []);
  return <OfflineChip />;
}

const meta: Meta<typeof OfflineChip> = {
  title: 'Components/OfflineChip',
  component: OfflineChip,
};
export default meta;

type Story = StoryObj<typeof OfflineChip>;

export const Online: Story = {}; // renders nothing — this is the default/common state
export const Offline: Story = { render: () => <ForceOffline /> };
