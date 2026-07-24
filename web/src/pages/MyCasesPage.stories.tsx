import type { Meta, StoryObj } from '@storybook/react-vite';
import MyCasesPage from './MyCasesPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('FO');

const meta: Meta<typeof MyCasesPage> = {
  title: 'Pages/Loans/MyCasesPage',
  component: MyCasesPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof MyCasesPage>;
export const Default: Story = {};
