import React from 'react';
import ThemeCutout from '../ThemeCutout';
import { getDisplayName } from '../../utils/teamMembers';

const ROLE_EMOJI = {
  owner: '👑',
  admin: '🛡️',
  editor: '✏️',
  lead_value_editor: '💰',
  lead_wiki_editor: '📖',
  value_editor: '💰',
  wiki_editor: '📖',
  fanart_editor: '🎨',
};

const SECTION_META = {
  value: { icon: '💰', label: 'Value' },
  values: { icon: '💰', label: 'Value' },
  wiki: { icon: '📖', label: 'WIKI' },
  map: { icon: '🗺️', label: 'Map' },
  maps: { icon: '🗺️', label: 'Map' },
  crate: { icon: '📦', label: 'Crate' },
  crates: { icon: '📦', label: 'Crate' },
  material: { icon: '🧪', label: 'Material' },
  materials: { icon: '🧪', label: 'Material' },
  unit: { icon: '🗿', label: 'Unit' },
};

export default function AdminCommandHeader({
  session,
  role,
  activeView,
  setActiveView,
  setActiveTool,
  spreadsheetMode,
  setSpreadsheetMode,
  valueAllowed,
  wikiAllowed,
  draftEntries = [],
  draftsOpen,
  setDraftsOpen,
  openDraft,
  discardDraft,
  publishPendingDelete,
  onResetPassword,
  onSignOut,
}) {
  const email = session?.user?.email;

  return (
    <header className="admin-topbar command-center-header">
      <ThemeCutout
        variant="hacker"
        floating
        className="admin-topbar-cutout"
      />

      <div className="admin-topbar-left">
        <div className="admin-brand-cluster">
          <span className="admin-live-dot" aria-hidden="true" />
          <span className="admin-topbar-title">⚡ APEX COMMAND CENTER</span>
          <span className="admin-kv-pill">CLOUDFLARE KV SYNC</span>
        </div>
        <span className="admin-topbar-user">
          {getDisplayName(email, true)} {ROLE_EMOJI[role] || '🔧'}{' '}
          <span className="admin-role-tag">{role}</span>
        </span>
      </div>

      {/* Quick Mode Switcher */}
      <div className="admin-command-pills">
        <button
          type="button"
          className={`admin-cmd-pill ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          📊 Overview
        </button>
        {valueAllowed && (
          <button
            type="button"
            className={`admin-cmd-pill ${activeView === 'values' && !spreadsheetMode ? 'active' : ''}`}
            onClick={() => {
              setSpreadsheetMode(false);
              setActiveView('values');
              setActiveTool('values');
            }}
          >
            💰 Values
          </button>
        )}
        {valueAllowed && (
          <button
            type="button"
            className={`admin-cmd-pill ${activeView === 'values' && spreadsheetMode ? 'active' : ''}`}
            onClick={() => {
              setSpreadsheetMode(true);
              setActiveView('values');
              setActiveTool('values');
            }}
          >
            📋 Matrix Sheet
          </button>
        )}
        {wikiAllowed && (
          <button
            type="button"
            className={`admin-cmd-pill ${activeView === 'wiki' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('wiki');
              setActiveTool('wiki');
            }}
          >
            📖 WIKI
          </button>
        )}
        <button
          type="button"
          className={`admin-cmd-pill ${activeView === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveView('logs')}
        >
          🕒 Blame & Logs
        </button>
      </div>

      <div className="admin-topbar-actions">
        {draftEntries.length > 0 && (
          <div className="admin-drafts-wrap">
            <button
              type="button"
              className="admin-drafts-pill"
              onClick={() => setDraftsOpen((v) => !v)}
              title="Unsaved drafts and pending deletions in this browser"
            >
              ✏️ {draftEntries.length} unsaved
            </button>
            {draftsOpen && (
              <div className="admin-drafts-panel card">
                <div className="admin-drafts-head">
                  <strong>Not live yet (this browser)</strong>
                  <button
                    type="button"
                    onClick={() => setDraftsOpen(false)}
                    aria-label="Close drafts panel"
                  >
                    ✕
                  </button>
                </div>
                <div className="admin-drafts-list" data-lenis-prevent>
                  {draftEntries.map((entry) => {
                    const meta = SECTION_META[entry.kind] || SECTION_META.value;
                    return (
                      <div
                        key={`${entry.type}:${entry.kind}:${entry.slug}`}
                        className="admin-drafts-row"
                      >
                        <span>
                          {meta.icon} {entry.slug}
                        </span>
                        <span className="admin-drafts-row-actions">
                          {entry.type === 'form' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openDraft(entry)}
                                title="Open this editor to review and save"
                              >
                                ✏️ Open
                              </button>
                              <button
                                type="button"
                                onClick={() => discardDraft(entry)}
                                title="Throw this draft away"
                              >
                                🗑️ Discard
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => publishPendingDelete(entry)}
                                title="Apply this deletion to the live database"
                              >
                                🗑️ Make live
                              </button>
                              <button
                                type="button"
                                onClick={() => discardDraft(entry)}
                                title="Cancel this deletion"
                              >
                                ↩️ Cancel
                              </button>
                            </>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        <button type="button" className="admin-topbar-btn" onClick={onResetPassword}>
          🔒 Password
        </button>
        <button type="button" className="admin-topbar-btn danger" onClick={onSignOut}>
          Logout
        </button>
      </div>
    </header>
  );
}
