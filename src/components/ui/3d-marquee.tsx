"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { tmdbService, type ContentItem } from "@/services/tmdb-service";

interface TMDBPoster {
  url: string;
  title: string;
}

export function Marquee3D() {
  const [posters, setPosters] = useState<TMDBPoster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadPosters = async () => {
    try {
      setIsLoading(true);
      
      // Get trending content from TMDB
      const trending = await tmdbService.getTrending();
      const popular = await tmdbService.getPopularMovies();
      const topRated = await tmdbService.getTopRatedMovies();
      
      // Combine all content
      const allContent = [...trending, ...popular, ...topRated];
      
      // Create poster array with TMDB images
      const posterList: TMDBPoster[] = allContent
        .filter((item: ContentItem) => item.poster)
        .slice(0, 40)
        .map((item: ContentItem) => ({
          url: item.poster!,
          title: item.title
        }));

      setPosters(posterList);
    } catch (error) {
      console.error('Error loading posters:', error);
      // Fallback to empty array if error
      setPosters([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosters();

    // Refresh posters every 2 minutes
    intervalRef.current = setInterval(() => {
      loadPosters();
    }, 120000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (isLoading || posters.length === 0) {
    return (
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="absolute inset-0 bg-black/20" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="absolute inset-0 bg-black/30" />
      
      {/* 4 columns of scrolling posters */}
      {[0, 1, 2, 3].map((columnIndex) => (
        <motion.div
          key={columnIndex}
          className="absolute h-[200vh] w-48"
          style={{
            left: `${columnIndex * 25}%`,
            transform: `perspective(1000px) rotateY(${columnIndex % 2 === 0 ? '15deg' : '-15deg'})`,
          }}
          animate={{
            y: columnIndex % 2 === 0 ? [0, -1000] : [-1000, 0],
          }}
          transition={{
            duration: 40 + columnIndex * 5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Duplicate posters for seamless loop */}
          {[...posters, ...posters].map((poster, index) => (
            <motion.div
              key={`${columnIndex}-${index}`}
              className="relative mb-6 group"
              whileHover={{ scale: 1.05, z: 50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative w-40 h-60 rounded-lg overflow-hidden shadow-2xl">
                <img
                  src={poster.url}
                  alt={poster.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Title overlay on hover */}
                <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-white text-sm font-semibold line-clamp-2">
                    {poster.title}
                  </h3>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ))}

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/10 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Dynamic gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-transparent to-orange-900/20"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
