

// Store the most recent chunks in memory
let recentChunks: string[] = [];
let lastUpdated: number = 0;
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes


export function storeRecentChunks(chunks: string[]): void {
  recentChunks = chunks;
  lastUpdated = Date.now();
  console.log(`Stored ${chunks.length} chunks in recent-chunks cache`);
}


export function getRecentChunks(): string[] | null {
  // If no chunks or chunks are too old, return null
  if (recentChunks.length === 0 || Date.now() - lastUpdated > MAX_AGE_MS) {
    return null;
  }
  
  return recentChunks;
}

export function clearRecentChunks(): void {
  recentChunks = [];
}
