import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import SplitPaneDrawer from './SplitPaneDrawer';
import { splitPane } from '../utils/splitPane';

function Shown() {
  useEffect(() => {
    splitPane.show({
      title: 'Document preview',
      content: <div style={{ padding: 24 }}>Preview content would render here.</div>,
      width: '480px',
    });
    return () => splitPane.close();
  }, []);
  return <SplitPaneDrawer />;
}

const meta: Meta<typeof SplitPaneDrawer> = {
  title: 'Components/SplitPaneDrawer',
  component: SplitPaneDrawer,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof SplitPaneDrawer>;

export const Default: Story = { render: () => <Shown /> };
