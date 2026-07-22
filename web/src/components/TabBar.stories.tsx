import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, Users, Home } from 'lucide-react';
import TabBar from './TabBar';
import { tabs } from '../utils/tabs';

// TabBar renders nothing when the shared `tabs` store is empty, so seed a
// few tabs before the story mounts.
tabs.get().tabs.forEach(t => tabs.close(t.id));
tabs.open('/app/dashboard', 'Dashboard');
tabs.open('/app/borrowers', 'Borrowers');
tabs.open('/app/collections', 'Collections');

const ICONS: Record<string, React.ElementType> = {
  '/app/dashboard': Home,
  '/app/borrowers': Users,
};

const meta: Meta<typeof TabBar> = {
  title: 'Components/TabBar',
  component: TabBar,
  args: {
    onActivate: () => {},
    onOpenNew: () => tabs.open('/app/reports', 'Reports'),
    getIcon: (path: string) => ICONS[path] ?? FileText,
  },
};
export default meta;

type Story = StoryObj<typeof TabBar>;

export const Default: Story = {};
