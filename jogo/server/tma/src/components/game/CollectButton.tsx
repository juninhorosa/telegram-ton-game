import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CollectButtonProps {
  onCollect: () => Promise<{ earnedVE: number; earnedCS: number }>;
}

export function CollectButton({ onCollect }: CollectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleCollect = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await onCollect();

      // Create particles
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 200,
        y: -100 - Math.random() * 100,
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: p.x, y: p.y, scale: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute text-cyan-400 text-lg pointer-events-none"
          >
            ✦
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleCollect}
        disabled={loading}
        className="w-32 h-32 rounded-full bg-gradient-to-br from-void-500 to-cyber-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-void-500/30 disabled:opacity-50"
      >
        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        ) : (
          <div className="text-center">
            <div className="text-2xl mb-1">⚡</div>
            <div>Collect</div>
          </div>
        )}
      </motion.button>
    </div>
  );
}
