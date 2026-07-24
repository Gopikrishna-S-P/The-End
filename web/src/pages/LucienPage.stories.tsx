import type { Meta, StoryObj } from '@storybook/react-vite';
import LucienPage from './LucienPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof LucienPage> = {
  title: 'Pages/Lucien/LucienPage',
  component: LucienPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof LucienPage>;
export const Default: Story = {};
