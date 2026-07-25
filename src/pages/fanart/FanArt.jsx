import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PageShell from '../../components/PageShell';
import PageIntro from '../../components/PageIntro';
import { WIKI_NAV } from '../../config/navigation';
import FanArtGallery from '../../components/fanart/FanArtGallery';
import FanArtAdmin from '../../components/fanart/FanArtAdmin';
import { supabase, isMissingTableError } from '../../utils/supabase';
import { useAdminStatus } from '../../hooks/useAdminStatus';

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
      const { data, error: fetchError } = await supabase
        .from('fanart_entries')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        if (isMissingTableError(fetchError)) {
          setError('FanArt database not set up yet. Admins can create entries in the admin panel.');
        } else {
          setError(`Failed to load FanArt: ${fetchError.message}`);
        }
        setEntries([]);
      } else {
        setEntries(data || []);
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

  // Live updates: approved/new fanart appears for everyone instantly — no
  // refresh needed — when an admin makes changes in the panel.
  useEffect(() => {
    const channel = supabase
      .channel('apex_fanart_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fanart_entries' }, () => {
        loadFanart({ silent: true });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
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
