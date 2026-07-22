import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { fn } from 'storybook/test';
import PageHelpDrawer from './PageHelpDrawer';

const meta: Meta<typeof PageHelpDrawer> = {
  title: 'Components/PageHelpDrawer',
  component: PageHelpDrawer,
  args: { open: true, onClose: fn(), pathname: '/app/dashboard' },
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof PageHelpDrawer>;

export const Default: Story = {};
export const UnknownPage: Story = { args: { pathname: '/app/nonexistent-page' } };
