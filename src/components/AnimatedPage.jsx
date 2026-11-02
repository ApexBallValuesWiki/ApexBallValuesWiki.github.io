import { motion } from 'framer-motion';

// Deliberate, unhurried page-transition: content glides upward and expands
// smoothly with a long exponential-out curve, accompanied by a subtle top
// accent progress sweep.
const pageVariants = {
  initial: { opacity: 0, y: 24, scale: 0.975 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.72,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.985,
    transition: { duration: 0.34, ease: [0.4, 0, 1, 1] },
  },
};

const detailVariants = {
  initial: { opacity: 0, y: 32, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.82,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.09,
    },
  },
  exit: {
    opacity: 0,
    y: -14,
    scale: 0.96,
    transition: { duration: 0.34, ease: [0.4, 0, 1, 1] },
  },
};

export default function AnimatedPage({ children, variant = 'default' }) {
  return (
    <motion.div
      className="apex-animated-page"
      variants={variant === 'detail' ? detailVariants : pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ transformOrigin: 'center top', width: '100%' }}
    >
      <div className="apex-route-sweep" aria-hidden="true" />
      {children}
    </motion.div>
  );
}
