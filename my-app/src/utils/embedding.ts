import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

// Initialize the HuggingFace Transformers model
const model = new HuggingFaceTransformersEmbeddings({
  model: "Xenova/all-MiniLM-L6-v2",
});


export async function getEmbedding(data: string): Promise<number[]> {
  try {
    const embedding = await model.embedQuery(data);
    console.log(`Generated embedding with ${embedding.length} dimensions`);
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Return a fallback embedding of zeros
    return new Array(384).fill(0); // MiniLM-L6 has 384 dimensions
  }
}


export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const embeddings = await model.embedDocuments(texts);
    console.log(`Generated ${embeddings.length} embeddings with ${embeddings[0]?.length || 0} dimensions each`);
    return embeddings;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    // Return fallback embeddings
    return texts.map(() => new Array(384).fill(0));
  }
}
