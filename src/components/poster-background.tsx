import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

interface FloatingPoster {
  id: string;
  src: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  opacity: number;
}

// Liste des posters disponibles (optimisée avec lazy loading)
const AVAILABLE_POSTERS = [
  '9.5_185906.jpg', '9.0_114176.jpg', '9.0_112130.jpg', '8.9_60196.jpg',
  '8.9_50083.jpg', '8.9_110912.jpg', '8.9_108052.jpg', '8.8_55233.jpg',
  '8.8_113147.jpg', '8.7_83480.jpg', '8.7_76759.jpg', '8.7_73486.jpg',
  '8.7_380275.jpg', '8.7_317248.jpg', '8.7_167261.jpg', '8.7_133093.jpg',
  '8.6_80297.jpg', '8.6_75520.jpg', '8.6_64116.jpg', '8.6_62759.jpg',
  '8.6_53115.jpg', '8.6_53114.jpg', '8.6_48434.jpg', '8.6_38650.jpg',
  '8.6_245429.jpg', '8.6_21749.jpg', '8.6_120815.jpg', '8.6_118799.jpg',
  '8.6_118114.jpg', '8.6_114814.jpg', '8.6_114369.jpg', '8.6_113610.jpg',
  '8.6_103767.jpg', '8.6_102926.jpg', '8.5_95327.jpg', '8.5_88763.jpg',
  '8.5_88178.jpg', '8.5_82971.jpg', '8.5_70644.jpg', '8.5_58625.jpg',
  '8.5_57012.jpg', '8.5_50825.jpg', '8.5_47396.jpg', '8.5_363510.jpg',
  '8.5_346336.jpg', '8.5_34583.jpg', '8.5_32553.jpg', '8.5_282864.jpg',
  '8.5_281376.jpg', '8.5_27977.jpg', '8.5_253474.jpg', '8.5_209144.jpg',
  '8.4_99851.jpg', '8.4_90015.jpg', '8.4_88727.jpg', '8.4_88275.jpg'
];

const getRandomPosters = (count: number): string[] => {
  const shuffled = [...AVAILABLE_POSTERS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export function PosterBackground() {
  const [posters, setPosters] = useState<FloatingPoster[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const posterElements = useMemo(() => {
    const elements: FloatingPoster[] = [];
    const selectedPosters = getRandomPosters(12); // Limité pour les performances
    
    selectedPosters.forEach((poster, index) => {
      elements.push({
        id: `poster-${index}`,
        src: `/poster_downloads/${poster}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 120 + 80, // Entre 80px et 200px
        duration: Math.random() * 25 + 20, // Entre 20s et 45s
        delay: Math.random() * 15,
        rotation: Math.random() * 30 - 15, // Entre -15° et 15°
        opacity: Math.random() * 0.4 + 0.1, // Entre 0.1 et 0.5
      });
    });
    
    return elements;
  }, []);

  useEffect(() => {
    setPosters(posterElements);
    
    // Précharger les images
    const preloadImages = async () => {
      const promises = posterElements.map((poster) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve; // Continue même si une image ne charge pas
          img.src = poster.src;
        });
      });
      
      await Promise.all(promises);
      setIsLoaded(true);
    };
    
    preloadImages();
  }, [posterElements]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient de base amélioré */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      
      {/* Overlay pour améliorer la lisibilité */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Posters flottants */}
      {isLoaded && posters.map((poster) => (
        <motion.div
          key={poster.id}
          className="absolute pointer-events-none"
          style={{
            left: `${poster.x}%`,
            top: `${poster.y}%`,
            width: poster.size,
            height: poster.size * 1.5, // Ratio des posters de films
          }}
          initial={{ 
            opacity: 0, 
            scale: 0.8,
            rotate: poster.rotation 
          }}
          animate={{
            opacity: [0, poster.opacity, poster.opacity, 0],
            scale: [0.8, 1, 1.1, 0.9, 1],
            rotate: [poster.rotation, poster.rotation + 5, poster.rotation - 5, poster.rotation],
            y: [0, -50, 0],
            x: [0, Math.sin(Date.now() / 1000) * 30, 0],
          }}
          transition={{
            duration: poster.duration,
            delay: poster.delay,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.2, 0.8, 1], // Contrôle des keyframes
          }}
        >
          <div className="relative w-full h-full">
            <img
              src={poster.src}
              alt="Movie Poster"
              className="w-full h-full object-cover rounded-lg shadow-2xl border border-white/10"
              style={{
                filter: 'blur(0.5px) saturate(0.8)',
              }}
              loading="lazy"
            />
            {/* Effet de brillance occasionnel */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-lg opacity-0"
              animate={{
                opacity: [0, 0.3, 0],
              }}
              transition={{
                duration: 3,
                delay: poster.delay + 5,
                repeat: Infinity,
                repeatDelay: 10,
              }}
            />
          </div>
        </motion.div>
      ))}

      {/* Particules de lumière pour l'ambiance */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`light-${i}`}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 4 + 2,
              delay: Math.random() * 10,
              repeat: Infinity,
            }}
          />
        ))}
      </div>

      {/* Vignette subtile pour améliorer le focus */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20" />
    </div>
  );
} 