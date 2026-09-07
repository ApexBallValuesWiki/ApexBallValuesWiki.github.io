import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PageShell from '../../components/PageShell';
import PageIntro from '../../components/PageIntro';
import { WIKI_NAV } from '../../config/navigation';
import FanArtGallery from '../../components/fanart/FanArtGallery';
import FanArtAdmin from '../../components/fanart/FanArtAdmin';
import { APEX_KV_URL } from '../../utils/apexClient';
import { useAdminStatus } from '../../hooks/useAdminStatus';

const POLL_MS = 120000;

export default function FanArt() {
  const { role } = useAdminStatus();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);

  const canManageFanart = role === 'owner' || role === 'admin' || role === 'fanart_editor';

  const loadFanart = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${APEX_KV_URL}/fanart`).catch(() => null);
      if (!response || !response.ok) {
        if (!silent) {
          setError('Unable to connect to the FanArt database. Please try again later.');
          setEntries([]);
        }
      } else {
        const all = await response.json();
        const approved = (Array.isArray(all) ? all : [])
          .filter((entry) => entry && entry.approved)
          .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        setEntries(approved);
        setError(null);
      }
    } catch {
      if (!silent) {
        setError('Unable to connect to the database. Please try again later.');
        setEntries([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFanart();
  }, [loadFanart]);

  // Live updates: approved/new fanart appears for everyone within a couple of
  // minutes — no refresh needed — when an admin publishes from the panel.
  useEffect(() => {
    const pollId = window.setInterval(() => {
      loadFanart({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(pollId);
  }, [loadFanart]);

  const handleFanartChange = async () => {
    await loadFanart();
  };

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <PageIntro eyebrow="Community Creations" title="FanArt">
        <p>
          Explore amazing fan-created artwork featuring units from Ball Tower Defense!
          All submitted art is community-vetted and approved for display here.
        </p>
      </PageIntro>

      {error && (
        <motion.div
          className="card"
          style={{ marginBottom: 24, padding: '16px', border: '1px solid var(--border)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p style={{ color: 'var(--text-dim)', margin: 0 }}>{error}</p>
        </motion.div>
      )}

      {canManageFanart && (
        <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={showAdmin ? 'filled' : ''}
            onClick={() => setShowAdmin(!showAdmin)}
          >
            {showAdmin ? '← Back to Gallery' : 'Manage FanArt'}
          </button>
        </div>
      )}

      {showAdmin && canManageFanart ? (
        <FanArtAdmin entries={entries} onChange={handleFanartChange} />
      ) : (
        <FanArtGallery entries={entries} loading={loading} />
      )}
    </PageShell>
  );
}
