import { motion } from 'framer-motion';

const cardVariants = {
  initial: { opacity: 0, y: 18 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

export default function FanArtGallery({ entries, loading }) {
  if (loading) {
    return (
      <div className="empty-state" style={{ marginTop: 40 }}>
        Loading FanArt gallery…
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 40 }}>
        No FanArt submissions yet. Be the first to submit your creation!
      </div>
    );
  }

  return (
    <motion.div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20,
      }}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {entries.map((entry) => (
        <motion.div
          key={entry.id}
          className="card"
          style={{
            overflow: 'hidden',
            padding: 0,
          }}
          variants={cardVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          {entry.image_url && (
            <div style={{ position: 'relative', paddingTop: '66%', background: 'var(--bg-elevated)' }}>
              <img
                src={entry.image_url}
                alt={entry.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                loading="lazy"
              />
            </div>
          )}
          <div style={{ padding: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem' }}>{entry.title}</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '0 0 10px' }}>
              by <strong style={{ color: 'var(--text)' }}>{entry.artist_name}</strong>
            </p>
            {entry.description && (
              <p style={{ color: 'var(--text-faint)', fontSize: '0.82rem', margin: 0 }}>
                {entry.description}
              </p>
            )}
            {entry.created_at && (
              <p style={{ color: 'var(--text-faint)', fontSize: '0.72rem', margin: '10px 0 0' }}>
                Submitted {new Date(entry.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
