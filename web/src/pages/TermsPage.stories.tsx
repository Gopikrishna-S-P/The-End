import type { Meta, StoryObj } from '@storybook/react-vite';
import TermsPage from './TermsPage';
import { withPageProviders } from './storyKit';

const meta: Meta<typeof TermsPage> = {
  title: 'Pages/Public/TermsPage',
  component: TermsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof TermsPage>;
export const Default: Story = {};
