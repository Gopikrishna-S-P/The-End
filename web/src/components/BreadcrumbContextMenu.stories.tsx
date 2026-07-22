import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import BreadcrumbContextMenu from './BreadcrumbContextMenu';

const meta: Meta<typeof BreadcrumbContextMenu> = {
  title: 'Components/BreadcrumbContextMenu',
  component: BreadcrumbContextMenu,
  args: {
    open: true, x: 120, y: 80, url: '/app/borrowers', label: 'Borrowers', bookmarked: false,
    onClose: fn(), onCopyUrl: fn(), onOpenNewTab: fn(), onToggleBookmark: fn(), onReload: fn(),
  },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof BreadcrumbContextMenu>;

export const Default: Story = {};
export const Bookmarked: Story = { args: { bookmarked: true } };
