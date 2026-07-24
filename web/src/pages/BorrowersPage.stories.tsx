import type { Meta, StoryObj } from '@storybook/react-vite';
import BorrowersPage from './BorrowersPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('ORG_ADMIN');

const meta: Meta<typeof BorrowersPage> = {
  title: 'Pages/Loans/BorrowersPage',
  component: BorrowersPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof BorrowersPage>;
export const Default: Story = {};
