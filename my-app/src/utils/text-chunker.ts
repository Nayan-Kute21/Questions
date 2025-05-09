
export function createTextChunks(text: string, chunkSize: number = 2000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    // Determine the end index for this chunk, not exceeding text length
    let endIndex = Math.min(currentIndex + chunkSize, text.length);
    
    // If we're not at the end of the text, try to find a natural break point
    if (endIndex < text.length) {
      // Look for the last occurrence of a sentence end or paragraph within the chunk
      const lastSentenceEnd = text.substring(currentIndex, endIndex).lastIndexOf('.');
      const lastParagraphEnd = text.substring(currentIndex, endIndex).lastIndexOf('\n');
      
      // Use the latest natural break if found
      const naturalBreak = Math.max(lastSentenceEnd, lastParagraphEnd);
      
      if (naturalBreak !== -1) {
        // Add 1 to include the period or newline in this chunk
        endIndex = currentIndex + naturalBreak + 1;
      } else {
        // If no natural break is found, find the last space to avoid splitting words
        const lastSpace = text.substring(currentIndex, endIndex).lastIndexOf(' ');
        if (lastSpace !== -1) {
          endIndex = currentIndex + lastSpace + 1;
        }
      }
    }
    
    // Extract the chunk and add to our array
    chunks.push(text.substring(currentIndex, endIndex).trim());

    const moveForward = Math.max(1, endIndex - currentIndex - overlap);
    currentIndex += moveForward;
  }

  return chunks;
}
