import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users } from 'lucide-react';
import { platformApi } from '../api/platformApi';
import type { OrganizationSummary } from '../api/platformApi';
import { OrgsTab } from './PlatformSetupOrgsTab';
import { UsersTab } from './PlatformSetupUsersTab';
import '../styles/AppPage.css';
import './Dashboard.css';

type Tab = 'orgs' | 'users';

export default function PlatformSetupPage() {
  const [tab,  setTab]  = useState<Tab>('orgs');
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);

  const loadOrgs = useCallback(async () => {
    try { setOrgs(await platformApi.listOrganizations()); } catch { /* silent */ }
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  return (
    <div className="db-root">
      <div className="db-content">
        <motion.div className="db-inner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <header className="db-card-head ds-card db-card" style={{ marginBottom: 16, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="db-card-title">Platform Setup</h2>
              <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)' }}>
                / Manage organizations and platform users
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="db-trend-range-toggle" style={{ margin: 0 }}>
                <button type="button" onClick={() => setTab('orgs')}
                  className={`db-trend-range-btn${tab === 'orgs' ? ' is-active' : ''}`}
                  role="tab" aria-selected={tab === 'orgs'}>
                  <Building2 size={13} style={{ marginRight: 6 }} /> Organizations
                </button>
                <button type="button" onClick={() => setTab('users')}
                  className={`db-trend-range-btn${tab === 'users' ? ' is-active' : ''}`}
                  role="tab" aria-selected={tab === 'users'}>
                  <Users size={13} style={{ marginRight: 6 }} /> Admin Users
                </button>
              </div>
            </div>
          </header>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'orgs'
                ? <OrgsTab orgs={orgs} onOrgsChange={setOrgs} />
                : <UsersTab orgs={orgs} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
