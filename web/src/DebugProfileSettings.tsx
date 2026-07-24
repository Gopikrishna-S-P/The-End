import { useEffect } from 'react';
import ProfileSettingsDialog from './components/ProfileSettingsDialog';
import { profileSettings } from './utils/profileSettings';

export default function DebugProfileSettings() {
  useEffect(() => { profileSettings.show(); }, []);
  return <ProfileSettingsDialog />;
}
