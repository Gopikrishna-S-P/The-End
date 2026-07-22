import { useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { fn } from 'storybook/test';
import TopBar from './TopBar';

function WithRefs(props: Omit<React.ComponentProps<typeof TopBar>, 'notifRef' | 'breadcrumbDropRef'>) {
  const notifRef = useRef<HTMLDivElement>(null);
  const breadcrumbDropRef = useRef<HTMLDivElement>(null);
  return <TopBar {...props} notifRef={notifRef} breadcrumbDropRef={breadcrumbDropRef} />;
}

const meta: Meta<typeof TopBar> = {
  title: 'Components/TopBar',
  component: TopBar,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: 'fullscreen' },
  args: {
    scrolledDown: false,
    canGoBack: true,
    canGoForward: false,
    previousPathLabel: 'Dashboard',
    onGoBack: fn(),
    onGoForward: fn(),
    breadcrumbs: [{ label: 'Main', to: '/app/dashboard' }, { label: 'Borrowers', to: null }],
    locationPathname: '/app/borrowers',
    locationSearch: '',
    breadcrumbDrop: false,
    setBreadcrumbDrop: fn(),
    onCrumbCtx: fn(),
    onOpenPageHelp: fn(),
    filterChips: [],
    removeFilter: fn(),
    clearFilters: fn(),
    currentSection: 'Borrowers',
    onOpenPalette: fn(),
    onOpenSearch: fn(),
    showLucien: true,
    lucienOpen: false,
    onToggleLucien: fn(),
    unreadCount: 3,
    notifOpen: false,
    onBellClick: fn(),
    topbarHidden: new Set<string>(),
    onOpenShortcuts: fn(),
    onLogout: fn(),
    onExtend: fn(),
    user: { firstName: 'Gopikrishna', lastName: 'S P', email: 'gopikrishna@recoverpro.in' },
    roleLabel: 'Org Admin',
    userDropOpen: false,
    onToggleUserDrop: fn(),
    onCloseUserDrop: fn(),
    avatarColor: '#0AA550',
  },
};
export default meta;

type Story = StoryObj<typeof TopBar>;

export const Default: Story = { render: (args) => <WithRefs {...args} /> };

export const WithFilters: Story = {
  render: (args) => <WithRefs {...args} />,
  args: {
    filterChips: [
      { key: 'status', value: 'OVERDUE', label: 'Status: Overdue' },
      { key: 'bucket', value: '30-59', label: 'Bucket: 30-59 days' },
    ],
  },
};
