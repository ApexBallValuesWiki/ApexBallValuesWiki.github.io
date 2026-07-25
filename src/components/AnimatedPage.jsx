import { motion } from 'framer-motion';

// Base page-transition: content grows outward from its own center and
// fades in, giving every navigation a slight "opening from the middle"
// feel. Duration is tuned to be clearly noticeable without ever feeling
// like it's in the way of getting to a page.
const pageVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
};

// Stronger version used for detail pages (unit pages etc.) — bigger scale
// delta so the "grow from the middle" effect actually reads clearly.
const detailVariants = {
  initial: { opacity: 0, scale: 0.88 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

export default function AnimatedPage({ children, variant = 'default' }) {
  return (
    <motion.div
      variants={variant === 'detail' ? detailVariants : pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ transformOrigin: 'center center', width: '100%' }}
    >
      {children}
    </motion.div>
  );
}