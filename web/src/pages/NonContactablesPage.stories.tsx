import type { Meta, StoryObj } from '@storybook/react-vite';
import NonContactablesPage from './NonContactablesPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof NonContactablesPage> = {
  title: 'Pages/Loans/NonContactablesPage',
  component: NonContactablesPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof NonContactablesPage>;
export const Default: Story = {};
