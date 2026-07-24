import type { Meta, StoryObj } from '@storybook/react-vite';
import PtpsPage from './PtpsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof PtpsPage> = {
  title: 'Pages/Collections/PtpsPage',
  component: PtpsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof PtpsPage>;
export const Default: Story = {};
