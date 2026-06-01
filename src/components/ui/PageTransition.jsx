import React from 'react';
import { motion } from 'framer-motion';

const springPhysics = {
  type: 'spring',
  stiffness: 260,
  damping: 24,
};

const pageVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: springPhysics },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
};

const PageTransition = ({ children, className = '', delay = 0, as = 'div', style = {} }) => {
  const MotionComponent = motion[as] || motion.div;

  return (
    <MotionComponent
      className={className}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ width: '100%', ...style }}
      transition={delay ? { ...springPhysics, delay: delay / 1000 } : undefined}
    >
      {children}
    </MotionComponent>
  );
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

export const StaggerItem = ({ children, index, delay, className = '', style = {} }) => {
  let calculatedDelay = 0;
  if (delay !== undefined) {
    calculatedDelay = delay / 1000;
  } else if (index !== undefined) {
    calculatedDelay = index * 0.06;
  }

  const customTransition = calculatedDelay > 0 
    ? { ...springPhysics, delay: calculatedDelay }
    : springPhysics;

  return (
    <motion.div
      className={className}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={customTransition}
      style={style}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
