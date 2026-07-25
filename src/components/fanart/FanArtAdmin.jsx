import { useState } from 'react';
import { supabase, isMissingTableError } from '../../utils/supabase';

export default function FanArtAdmin({ onChange }) {
  const [pendingEntries, setPendingEntries] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    artist_name: '',
    image_url: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  async function loadPending() {
    setLoadingPending(true);
    try {
      const { data, error } = await supabase
        .from('fanart_entries')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false });

      if (error && isMissingTableError(error)) {
        setMessage('FanArt table not created. Run the schema SQL first.');
        setPendingEntries([]);
      } else if (error) {
        setMessage(`Error loading pending: ${error.message}`);
        setPendingEntries([]);
      } else {
        setPendingEntries(data || []);
        setMessage('');
      }
    } catch {
      setMessage('Failed to load pending entries.');
      setPendingEntries([]);
    }
    setLoadingPending(false);
  }

  async function approveEntry(entry) {
    const { error } = await supabase
      .from('fanart_entries')
      .update({ approved: true })
      .eq('id', entry.id);

    if (error) {
      setMessage(`Failed to approve: ${error.message}`);
    } else {
      setMessage(`"${entry.title}" approved!`);
      onChange();
      loadPending();
    }
  }

  async function deleteEntry(entry) {
    if (!window.confirm(`Delete "${entry.title}" by ${entry.artist_name}?`)) return;

    const { error } = await supabase
      .from('fanart_entries')
      .delete()
      .eq('id', entry.id);

    if (error) {
      setMessage(`Failed to delete: ${error.message}`);
    } else {
      setMessage(`"${entry.title}" deleted.`);
      onChange();
      loadPending();
    }
  }

  async function createEntry(e) {
    e.preventDefault();
    if (!form.title || !form.artist_name || !form.image_url) {
      setMessage('Title, artist name, and image URL are required.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('fanart_entries')
      .insert({
        title: form.title,
        artist_name: form.artist_name,
        image_url: form.image_url,
        description: form.description || null,
        approved: true, // Admins create directly as approved
      });

    if (error) {
      setMessage(`Failed to create: ${error.message}`);
    } else {
      setMessage('FanArt entry created!');
      setForm({ title: '', artist_name: '', image_url: '', description: '' });
      setShowCreate(false);
      onChange();
    }
    setSaving(false);
  }

  return (
    <section>
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={loadPending} disabled={loadingPending}>
          {loadingPending ? 'Loading…' : 'Load Pending Submissions'}
        </button>
        <button type="button" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New FanArt Entry'}
        </button>
      </div>

      {message && (
        <div className="pending-flag" style={{ marginBottom: 16 }}>
          {message}
        </div>
      )}

      {showCreate && (
        <form onSubmit={createEntry} className="card" style={{ marginBottom: 24, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px' }}>Create New FanArt Entry</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>Title *</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Artwork title"
                required
                style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>Artist Name *</span>
              <input
                type="text"
                value={form.artist_name}
                onChange={(e) => setForm({ ...form, artist_name: e.target.value })}
                placeholder="Your name or username"
                required
                style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>Image URL *</span>
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://example.com/artwork.jpg"
                required
                style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>Description (optional)</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the artwork"
                rows={3}
                style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', resize: 'vertical' }}
              />
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="filled" disabled={saving}>
                {saving ? 'Creating…' : 'Create Entry'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {pendingEntries.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Pending Submissions ({pendingEntries.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingEntries.map((entry) => (
              <div key={entry.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {entry.image_url && (
                  <img
                    src={entry.image_url}
                    alt={entry.title}
                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 'var(--radius)', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h4 style={{ margin: '0 0 4px' }}>{entry.title}</h4>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '0 0 8px' }}>
                    by {entry.artist_name}
                  </p>
                  {entry.description && (
                    <p style={{ color: 'var(--text-faint)', fontSize: '0.82rem', margin: 0 }}>
                      {entry.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" className="filled" onClick={() => approveEntry(entry)}>
                    Approve
                  </button>
                  <button type="button" onClick={() => deleteEntry(entry)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {pendingEntries.length === 0 && !loadingPending && !message && (
        <p style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>
          No pending submissions. Click "Load Pending Submissions" to check again.
        </p>
      )}
    </section>
  );
}
