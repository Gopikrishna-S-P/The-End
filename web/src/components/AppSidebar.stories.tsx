import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { fn } from 'storybook/test';
import AppSidebar from './AppSidebar';
import { NAV_SECTIONS } from '../utils/navConfig';
import type { SidebarSection } from './AppSidebarHelpers';

// NAV_SECTIONS entries carry role-visibility (`alwaysFor`) rather than a
// finished `items` array — filter down to a representative ORG_ADMIN view.
const sections: SidebarSection[] = NAV_SECTIONS.map(s => ({
  label: s.label,
  items: s.items
    .filter(i => i.alwaysFor?.includes('ORG_ADMIN'))
    .map(i => ({ to: i.to, label: i.label, icon: i.icon })),
})).filter(s => s.items.length > 0);

function Interactive({ collapsed: initialCollapsed }: { collapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(!!initialCollapsed);
  return (
    <AppSidebar
      sections={sections}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(c => !c)}
      onProfileSettings={fn()}
      onLogout={fn()}
      user={{ firstName: 'Gopikrishna', lastName: 'S P', email: 'gopikrishna@recoverpro.in', organizationName: 'Sri Nimishamba Associates' }}
      roleLabel="Org Admin"
      avatarColor="#0AA550"
    />
  );
}

const meta: Meta<typeof AppSidebar> = {
  title: 'Components/AppSidebar',
  component: AppSidebar,
  decorators: [(Story) => <MemoryRouter initialEntries={['/app/dashboard']}><div style={{ height: '100vh' }}><Story /></div></MemoryRouter>],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof AppSidebar>;

export const Expanded: Story = { render: () => <Interactive /> };
export const Collapsed: Story = { render: () => <Interactive collapsed /> };
