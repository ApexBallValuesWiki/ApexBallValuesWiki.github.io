import React from 'react';
import { AdminMessage } from './AdminParts';
import { compressImage } from '../../utils/adminSafety';

export default function AdminMaterialsSection({
  materialList = [],
  materialQuery = '',
  setMaterialQuery,
  selectedMaterial,
  setMaterialSlug,
  materialForm,
  setMaterialForm,
  materialImageFile,
  setMaterialImageFile,
  saveMaterial,
  saving,
  message,
  messageAction,
}) {
  return (
    <section className="admin-content-layout">
      <aside className="admin-unit-picker card">
        <div className="admin-section-head">
          <h2>Materials</h2>
          <span className="admin-count-badge">{materialList.length}</span>
        </div>
        <input
          className="admin-search"
          value={materialQuery}
          onChange={(e) => setMaterialQuery(e.target.value)}
          placeholder="Search materials…"
          aria-label="Search materials"
        />
        <div className="admin-unit-list" data-lenis-prevent>
          {materialList.map((m) => (
            <button
              type="button"
              key={m.slug}
              className={m.slug === selectedMaterial?.slug ? 'admin-unit active' : 'admin-unit'}
              onClick={() => setMaterialSlug(m.slug)}
            >
              <span className="admin-unit-text">
                <strong>{m.name}</strong>
                <small>{m.slug}{m.documented ? '' : ' · stub'}</small>
              </span>
            </button>
          ))}
        </div>
      </aside>
      <section className="admin-editor card">
        <p className="admin-kicker">Material</p>
        <h2>🧪 {selectedMaterial?.name || 'Material'}</h2>
        <AdminMessage message={message} action={messageAction} />
        <div className="admin-upload-zone">
          {materialImageFile || materialForm.imageUrl ? (
            <img
              className="admin-image-preview"
              src={materialImageFile ? URL.createObjectURL(materialImageFile) : materialForm.imageUrl}
              alt="Material preview"
            />
          ) : (
            <strong>Material image (optional)</strong>
          )}
          <label className="admin-upload-button">
            📸 Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f?.type?.startsWith('image/')) {
                  setMaterialImageFile(await compressImage(f));
                }
              }}
            />
          </label>
        </div>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Name</span>
            <input
              className="admin-text-input"
              value={materialForm.name}
              onChange={(e) => setMaterialForm((p) => ({ ...p, name: e.target.value }))}
            />
          </label>
          <label className="admin-field">
            <span>Effect</span>
            <input
              className="admin-text-input"
              value={materialForm.effect}
              onChange={(e) => setMaterialForm((p) => ({ ...p, effect: e.target.value }))}
              placeholder="e.g. Unlocks the Frost Key door"
            />
          </label>
          <label className="admin-field full">
            <span>Description</span>
            <textarea
              className="admin-textarea"
              rows={2}
              value={materialForm.description}
              onChange={(e) => setMaterialForm((p) => ({ ...p, description: e.target.value }))}
            />
          </label>
          <label className="admin-field full">
            <span>How to obtain (one per line)</span>
            <textarea
              className="admin-textarea"
              rows={2}
              value={materialForm.obtainText}
              onChange={(e) => setMaterialForm((p) => ({ ...p, obtainText: e.target.value }))}
            />
          </label>
          <div className="admin-field full">
            <button
              type="button"
              className="filled"
              onClick={saveMaterial}
              disabled={saving}
            >
              {saving ? 'Saving…' : '💾 Save Material'}
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
