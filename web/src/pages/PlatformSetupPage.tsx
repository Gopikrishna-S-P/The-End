import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { platformApi } from '../api/platformApi';
import type { OrganizationSummary } from '../api/platformApi';
import { OrgsTab } from './PlatformSetupOrgsTab';
import { UsersTab } from './PlatformSetupUsersTab';
import '../styles/AppPage.css';
import '../styles/PlatformSetupPage.css';
import './Dashboard.css';

type Tab = 'orgs' | 'users';

export default function PlatformSetupPage() {
  const [searchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'orgs';
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);

  const loadOrgs = useCallback(async () => {
    try { setOrgs(await platformApi.listOrganizations()); } catch { /* silent */ }
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);
  useEffect(() => { setShowCreateOrg(false); setShowCreateUser(false); }, [tab]);

  return (
    <div className="db-root">
      <div className="db-content">
        <motion.div className="db-inner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="db-page-header">
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-tertiary)', margin: 0 }}>
              Manage organizations and platform users
            </p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'orgs'
                ? <OrgsTab orgs={orgs} onOrgsChange={setOrgs} showCreate={showCreateOrg} setShowCreate={setShowCreateOrg} />
                : <UsersTab orgs={orgs} showCreate={showCreateUser} setShowCreate={setShowCreateUser} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
      {(tab === 'orgs' || tab === 'users') && (
        <button type="button"
          onClick={() => tab === 'orgs' ? setShowCreateOrg(true) : setShowCreateUser(true)}
          title={tab === 'orgs' ? 'New organization' : 'New admin user'}
          aria-label={tab === 'orgs' ? 'New organization' : 'New admin user'}
          style={{
            position: 'fixed', bottom: 28, right: 32, zIndex: 50,
            width: 56, height: 56, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--brand)', border: 'none', color: 'var(--text-on-solid)', cursor: 'pointer',
            boxShadow: '0 8px 20px color-mix(in srgb, var(--text-primary) 22%, transparent), 0 2px 6px color-mix(in srgb, var(--text-primary) 14%, transparent)',
            transition: 'transform 120ms ease, box-shadow 120ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
