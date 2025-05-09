import { NextResponse } from 'next/server';
import { deleteAllDocuments } from '@/utils/pinecone';

export async function DELETE() {
  try {
    // Get the index name from environment variables
    const indexName = process.env.PINECONE_INDEX || "pdf-embedding";
    
    console.log(`Attempting to delete all documents from Pinecone index: ${indexName}`);
    
    // Delete all documents from Pinecone
    const result = await deleteAllDocuments(indexName);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully deleted ${result.deletedCount} documents from the database` 
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete documents' },
      { status: 500 }
    );
  }
}
