// Simple test to verify navigation logic
const mockContentItem = {
  tmdb_id: 12345,
  imdb_id: 'tt1234567',
  title: 'Test Movie',
  type: 'movie',
  year: 2023,
  rating: 8.5,
  genres: ['Action', 'Drama'],
  poster: 'https://example.com/poster.jpg',
  overview: 'A test movie for navigation testing'
};

// Test the smart content mapper conversion logic
const convertToCardFormat = (item) => {
  return {
    id: item.tmdb_id.toString(),
    imdb_id: item.imdb_id || `tmdb_${item.tmdb_id}`,
    title: item.title,
    year: item.year,
    rating: item.rating,
    genres: item.genres,
    poster: item.poster || undefined,
    backdropPath: item.backdropPath || undefined,
    overview: item.overview,
    type: item.type,
    runtime: item.runtime,
    tmdb_rating: item.rating,
    seasons: item.seasons || undefined,
    episodes: item.episodes || undefined,
    tmdb_id: item.tmdb_id
  };
};

// Test the navigation logic
const handlePlay = (contentId, allContent) => {
  console.log('Playing content with ID:', contentId);
  const item = allContent.find(item => item.tmdb_id.toString() === contentId);
  console.log('Found item for streaming:', item);
  
  if (item) {
    // Use TMDB ID consistently for streaming navigation (matches other components)
    console.log('Using TMDB ID for streaming:', item.tmdb_id, 'for type:', item.type);
    return `/watch/${item.type}/${item.tmdb_id}`;
  }
  return null;
};

// Test the conversion
const cardFormat = convertToCardFormat(mockContentItem);
console.log('Card format:', cardFormat);

// Test the navigation
const allContent = [mockContentItem];
const navigationUrl = handlePlay(mockContentItem.tmdb_id.toString(), allContent);
console.log('Navigation URL:', navigationUrl);

// Verify the results
console.log('\n=== Test Results ===');
console.log('✓ Card format includes tmdb_id:', cardFormat.tmdb_id === mockContentItem.tmdb_id);
console.log('✓ Card format uses TMDB ID as primary ID:', cardFormat.id === mockContentItem.tmdb_id.toString());
console.log('✓ Navigation uses TMDB ID consistently:', navigationUrl === `/watch/movie/${mockContentItem.tmdb_id}`);
console.log('✓ Navigation URL format matches other components:', navigationUrl.includes('/watch/movie/'));