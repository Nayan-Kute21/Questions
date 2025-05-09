import { Pinecone } from "@pinecone-database/pinecone";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});


const createBatches = <T>(array: T[], batchSize = 100): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
};


export async function storeEmbeddingsInPinecone(
  indexName: string,
  chunks: { text: string; embedding: number[] }[],
  metadata: Record<string, any> = {}
) {
  try {
    console.log(`Connecting to Pinecone index: ${indexName}`);
    
    // Get all available indexes to verify the index exists
    const response = await pinecone.listIndexes();
    console.log("Pinecone indexes response structure:", Object.keys(response));
    
    // Extract indexes from the response - Pinecone returns { indexes: [...] }
    const indexes = response.indexes || [];
    console.log(`Found ${indexes.length} indexes in your Pinecone account`);
    
    // Log the available indexes
    const availableIndexes = indexes.map(idx => idx.name);
    console.log(`Available indexes: ${availableIndexes.join(', ')}`);
    
    // Find our target index
    const targetIndex = indexes.find(idx => idx.name === indexName);
    
    if (!targetIndex) {
      console.error(`Index "${indexName}" not found in your Pinecone account`);
      throw new Error(`Index "${indexName}" not found. Please check your Pinecone account.`);
    }
    
    console.log(`Found index "${indexName}" with dimension ${targetIndex.dimension}`);
    
    // Check if embedding dimensions match the index dimensions
    const embeddingDimension = chunks[0]?.embedding?.length || 0;
    if (embeddingDimension !== targetIndex.dimension) {
      console.warn(
        `Warning: Your embeddings have ${embeddingDimension} dimensions, but the index "${indexName}" ` +
        `expects ${targetIndex.dimension} dimensions.`
      );
    }

    // Get the index with the host information
    const index = pinecone.index(indexName);

    // Prepare the records for Pinecone
    const records = chunks.map((chunk, i) => ({
      id: `${metadata.filename || 'doc'}-chunk-${i}-${Date.now()}`,
      values: chunk.embedding,
      metadata: {
        text: chunk.text,
        ...metadata,
      },
    }));

    console.log(`Preparing to store ${records.length} chunks in Pinecone index ${indexName}`);

    // Create batches to avoid overwhelming the API
    const batches = createBatches(records, 100);
    
    // Store vectors in batches
    let totalVectorsUpserted = 0;
    
    await Promise.all(
      batches.map(async (batch, batchIndex) => {
        try {
          // Execute the upsert operation - note that it might not return a value
          await index.upsert(batch);
          
          // Since we can't rely on the upsert response, just count the batch size
          const upsertedCount = batch.length;
          console.log(`Batch ${batchIndex + 1}/${batches.length} upserted: ${upsertedCount} vectors`);
          totalVectorsUpserted += upsertedCount;
        } catch (error) {
          console.error(`Error upserting batch ${batchIndex + 1}:`, error);
          throw error;
        }
      })
    );

    return {
      success: true,
      vectorCount: totalVectorsUpserted,
      message: `Successfully stored ${totalVectorsUpserted} vectors in Pinecone`
    };
  } catch (error) {
    console.error("Error storing embeddings in Pinecone:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error storing vectors",
    };
  }
}


export async function querySimilarChunks(
  indexName: string,
  queryEmbedding: number[],
  topK = 5
) {
  try {
    // Get the index
    const index = pinecone.index(indexName);
    
    // Query the index
    const queryResult = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });
    
    return {
      success: true,
      matches: queryResult.matches || [],
    };
  } catch (error) {
    console.error("Error querying Pinecone:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error querying vectors",
      matches: [],
    };
  }
}


export async function getRandomChunksFromPinecone(indexName: string, count: number = 5) {
  try {
    // Get the index
    const index = pinecone.index(indexName);
    
    // Since Pinecone doesn't have a direct "random" query feature,
    // we'll fetch IDs first and then get a random sample
    const allVectorsQuery = await index.query({
      vector: new Array(384).fill(0), // Dummy vector
      topK: 100,
      includeMetadata: false
    });
    
    // If we have matches
    if (allVectorsQuery.matches && allVectorsQuery.matches.length > 0) {
      // Select random IDs
      const allIds = allVectorsQuery.matches.map(match => match.id);
      const randomIds = getRandomSample(allIds, Math.min(count, allIds.length));
      
      // Fetch the actual vectors with metadata
      const chunksWithData = [];
      
      for (const id of randomIds) {
        try {
          const fetchResult = await index.fetch([id]);
          
          // Log the structure once to debug
          if (randomIds.indexOf(id) === 0) {
            console.log('Pinecone fetch response structure:', JSON.stringify(fetchResult, null, 2));
          }
          
          // Handle different possible response structures
          if (fetchResult && typeof fetchResult === 'object') {
            // Try different possible paths to access the vector data
            let vectorData = null;
            
            // Check for records property (newer API versions)
            if ('records' in fetchResult && fetchResult.records && id in fetchResult.records) {
              // Type-safe access with proper check
              vectorData = fetchResult.records[id];
            } 
            // Check for vectors property (older API versions)
            else if ('vectors' in fetchResult && 
                    fetchResult.vectors && 
                    typeof fetchResult.vectors === 'object' &&
                    id in (fetchResult.vectors as Record<string, unknown>)) {
              // Cast vectors to a Record with string keys for type safety
              vectorData = (fetchResult.vectors as Record<string, unknown>)[id];
            }
            
            if (vectorData) {
              chunksWithData.push(vectorData);
            }
          }
        } catch (error) {
          console.warn(`Error fetching vector ${id}:`, error);
        }
      }
      
      return chunksWithData;
    }
    
    return [];
  } catch (error) {
    console.error("Error getting random chunks from Pinecone:", error);
    return [];
  }
}


function getRandomSample<T>(array: T[], sampleSize: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, sampleSize);
}


export async function deleteAllDocuments(indexName: string) {
  try {
    // Get the index
    const index = pinecone.index(indexName);
    
    console.log(`Attempting to delete all vectors from index "${indexName}"`);
    
    // Delete all vectors (namespace is optional, omitting it targets all vectors)
    await index.deleteAll();
    
    console.log(`Successfully deleted all documents from index "${indexName}"`);
    
    return {
      success: true,
      message: `All documents deleted from index "${indexName}"`,
      deletedCount: "all" // The API doesn't return a count
    };
  } catch (error) {
    console.error("Error deleting all vectors:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error deleting vectors"
    };
  }
}


export async function getAllChunks(indexName: string, limit: number = 20) {
  try {
    // Get the index
    const index = pinecone.index(indexName);
    
    // Since Pinecone doesn't have a "get all" API, use a query with a neutral vector
    const neutralVector = new Array(384).fill(0);
    
    // Implement retry logic with exponential backoff
    const maxRetries = 5;
    let matches = [];
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      console.log(`Attempt ${attempt + 1}/${maxRetries} to retrieve chunks from Pinecone`);
      
      const queryResult = await index.query({
        vector: neutralVector,
        topK: limit,
        includeMetadata: true,
      });
      
      if (queryResult.matches && queryResult.matches.length > 0) {
        console.log(`Successfully retrieved ${queryResult.matches.length} chunks on attempt ${attempt + 1}`);
        matches = queryResult.matches;
        break;
      }
      
      // If no results, wait with exponential backoff before retrying
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000; // Convert to milliseconds
        console.log(`No data found. Retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    if (matches.length === 0) {
      console.log("Data not available in index after all retry attempts.");
    }
    
    return matches;
  } catch (error) {
    console.error("Error fetching chunks from Pinecone:", error);
    return [];
  }
}
