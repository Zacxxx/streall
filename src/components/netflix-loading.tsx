import { motion } from 'framer-motion';

interface NetflixLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function NetflixLoading({ message = "Loading...", fullScreen = false }: NetflixLoadingProps) {
  const containerClass = fullScreen 
    ? "fixed inset-0 bg-black flex items-center justify-center z-50"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClass}>
      <div className="text-center">
        {/* Netflix-style loading animation */}
        <div className="relative mb-6">
          <motion.div
            className="w-16 h-16 border-4 border-red-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{
              borderTopColor: 'transparent',
              borderRightColor: 'transparent'
            }}
          />
          <motion.div
            className="absolute inset-0 w-16 h-16 border-4 border-red-400 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent'
            }}
          />
        </div>
        
        {/* Loading text */}
        <motion.p 
          className="text-white text-lg font-medium"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
        >
          {message}
        </motion.p>
      </div>
    </div>
  );
}

// Skeleton loader for cards
export function NetflixCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex space-x-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="flex-shrink-0 w-48 h-72 bg-slate-800 rounded-lg"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            repeatType: "reverse",
            delay: i * 0.1 
          }}
        />
      ))}
    </div>
  );
}

// Grid skeleton for browse page
export function NetflixGridSkeleton({ 
  count = 48, 
  columns = 8 
}: { 
  count?: number; 
  columns?: number; 
}) {
  const gridClass = `grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-${columns}`;
  
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="aspect-[2/3] bg-slate-800 rounded-lg"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            repeatType: "reverse",
            delay: (i % 12) * 0.05 
          }}
        />
      ))}
    </div>
  );
} 