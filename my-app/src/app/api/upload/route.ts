import { NextResponse } from 'next/server';
import { extractTextFromPdf } from '@/utils/pdf-parser';
import { createTextChunks } from '@/utils/text-chunker';
import { getEmbeddings } from '@/utils/embedding';
import { storeEmbeddingsInPinecone } from '@/utils/pinecone';
import { storeRecentChunks } from '@/utils/recent-chunks-cache';

export async function POST(request: Request) {
  try {
    // Get form data from the request
    const formData = await request.formData();
    
    // Get the uploaded file
    const pdfFile = formData.get('file');
    
    if (!pdfFile || !(pdfFile instanceof File)) {
      return NextResponse.json(
        { error: 'PDF file is required' },
        { status: 400 }
      );
    }
    
    // Check if the uploaded file is a PDF
    if (!pdfFile.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Uploaded file is not a PDF' },
        { status: 400 }
      );
    }
    
    // Convert the file to ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text from the PDF
    const { text: extractedText, jobTitle } = await extractTextFromPdf(buffer);
    
    // Create chunks of the extracted text with overlap
    const chunks = createTextChunks(extractedText, 500, 200);
    console.log(`Created ${chunks.length} text chunks with 200 character overlap`);
    
    // Store the chunks in memory cache for immediate use in question generation
    storeRecentChunks(chunks);
    
    // Generate embeddings for all chunks using HuggingFace Transformers
    console.log(`Generating embeddings for ${chunks.length} chunks using HuggingFace Transformers...`);
    
    try {
      // Process chunks in batches to avoid memory issues
      const batchSize = 20; // Process 20 chunks at a time (HuggingFace can handle more)
      const embeddingsWithChunks = [];
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batchChunks = chunks.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
        
        // Get embeddings for this batch using HuggingFace transformers
        const batchEmbeddings = await getEmbeddings(batchChunks);
        
        // Combine chunk text with their embeddings
        const batchResults = batchChunks.map((text, index) => {
          const embedding = batchEmbeddings[index] || [];
          return {
            text,
            embedding,
            visualDimensions: embedding.slice(0, 10)
          };
        });
        
        embeddingsWithChunks.push(...batchResults);
      }
      
      // Store the embeddings in Pinecone
      console.log("Storing embeddings in Pinecone...");
      const filename = (pdfFile as File).name;
      
      // Use the pdf-embedding index specifically
      const pineconeResult = await storeEmbeddingsInPinecone(
        "pdf-embedding", // Hardcoded to use the specific index we know exists
        embeddingsWithChunks.map(chunk => ({ 
          text: chunk.text, 
          embedding: chunk.embedding 
        })),
        { 
          filename,
          jobTitle,
          source: "pdf-upload",
          timestamp: new Date().toISOString()
        }
      );
      
      if (!pineconeResult.success) {
        console.warn("Warning: Failed to store vectors in Pinecone:", pineconeResult.error);
      } else {
        console.log(`Successfully stored ${pineconeResult.vectorCount} vectors in Pinecone`);
      }
      
      // Return the extracted text, chunks with embeddings, and job title
      return NextResponse.json({
        message: 'PDF processed successfully',
        text: extractedText,
        chunks: embeddingsWithChunks,
        jobTitle: jobTitle,
        vectorStorage: pineconeResult.success ? 'success' : 'failed'
      });
      
    } catch (error) {
      console.error('Error generating embeddings:', error);
      
      // If embeddings fail, return chunks without embeddings
      const chunksWithoutEmbeddings = chunks.map(text => ({
        text,
        embedding: [],
        visualDimensions: []
      }));
      
      return NextResponse.json({
        message: 'PDF processed with limited functionality (embeddings failed)',
        text: extractedText,
        chunks: chunksWithoutEmbeddings,
        jobTitle: jobTitle,
        error: 'Embedding generation failed. Please check browser console for details.'
      });
    }
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}
