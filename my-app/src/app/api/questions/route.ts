import { NextResponse } from 'next/server';
import { querySimilarChunks, getAllChunks } from '@/utils/pinecone';
import { getEmbedding } from '@/utils/embedding';
import { generateQuestionsFromChunks } from '@/utils/gemini';
import { getRecentChunks } from '@/utils/recent-chunks-cache';

// Improved fallback questions - reduced to 5 more diverse questions
const FALLBACK_QUESTIONS = [
  "What are the key objectives or goals outlined in this document?",
  "How does this document address challenges in its specific domain?",
  "What methodologies or strategies are proposed in the content?",
  "Who are the main stakeholders mentioned and how do they relate to each other?",
  "What actionable recommendations can be derived from this material?"
];

// Function to remove duplicate or very similar questions
function removeDuplicateQuestions(questions: string[]): string[] {
  // Convert questions to lowercase for comparison
  const lowercaseQuestions = questions.map(q => q.toLowerCase());
  const uniqueQuestions: string[] = [];
  const uniqueLowercase: string[] = [];
  
  // Words that indicate generic questions we want to limit
  const genericPhrases = ["insights", "drawn", "what insights can be drawn"];
  
  // Check each question
  for (const [index, question] of questions.entries()) {
    const lowerQuestion = lowercaseQuestions[index];
    
    // Skip if it's a generic "insights" question and we already have one
    if (genericPhrases.some(phrase => lowerQuestion.includes(phrase)) && 
        uniqueLowercase.some(q => genericPhrases.some(phrase => q.includes(phrase)))) {
      continue;
    }
    
    // Check if this question is too similar to any we've already kept
    const isDuplicate = uniqueLowercase.some(q => {
      // Simple similarity check - if they share more than 60% of the same words
      const words1 = new Set(q.split(/\s+/));
      const words2 = new Set(lowerQuestion.split(/\s+/));
      const intersection = [...words1].filter(word => words2.has(word)).length;
      const similarity = intersection / Math.max(words1.size, words2.size);
      return similarity > 0.6;
    });
    
    if (!isDuplicate) {
      uniqueQuestions.push(question);
      uniqueLowercase.push(lowerQuestion);
      
      // If we have 5 unique questions, that's enough
      if (uniqueQuestions.length >= 5) break;
    }
  }
  
  return uniqueQuestions;
}

export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic') || '';
    
    // Get the index name
    const indexName = process.env.PINECONE_INDEX || "pdf-embedding";
    
    // If no topic is specified, check for recent chunks first
    if (!topic) {
      try {
        console.log("No topic specified, checking for recent chunks...");
        
        // Check if we have recent chunks from an upload
        const recentChunks = getRecentChunks();
        
        if (recentChunks && recentChunks.length > 0) {
          console.log(`Found ${recentChunks.length} recent chunks from upload, using those for question generation`);
          
          // Generate questions using the recent chunks from upload
          let questions = await generateQuestionsFromChunks(recentChunks);
          
          // Remove duplicate questions and ensure we don't have too many "insights" questions
          questions = removeDuplicateQuestions(questions);
          
          console.log(`Generated ${questions.length} unique questions from recent chunks`);
          
          // If we have fewer than 5 questions after deduplication, add some from fallback
          if (questions.length < 5) {
            const missingCount = 5 - questions.length;
            questions = [...questions, ...FALLBACK_QUESTIONS.slice(0, missingCount)];
          }
          
          return NextResponse.json({ 
            questions: questions.slice(0, 5), // Limit to 5 questions
            topic: 'general',
            source: 'recent-upload'
          });
        }
        
        // If no recent chunks, fall back to getting chunks from the database
        console.log("No recent chunks found, falling back to database");
        const allChunks = await getAllChunks(indexName, 10);
        
        if (allChunks.length === 0) {
          console.log("No chunks found in the database. Returning fallback questions.");
          return NextResponse.json({ 
            questions: FALLBACK_QUESTIONS,
            topic: 'general'
          });
        }
        
        // Extract text from the chunks
        const chunkTexts = allChunks.map(chunk => 
          chunk.metadata?.text || ""
        ).filter(text => text.length > 0);
        
        if (chunkTexts.length === 0) {
          console.log("No valid text in chunks. Returning fallback questions.");
          return NextResponse.json({ 
            questions: FALLBACK_QUESTIONS,
            topic: 'general'
          });
        }
        
        console.log(`Generating questions from ${chunkTexts.length} document chunks`);
        
        // Generate questions using document chunks directly
        let questions = await generateQuestionsFromChunks(chunkTexts);
        questions = removeDuplicateQuestions(questions);
        
        return NextResponse.json({ 
          questions: questions.length > 0 ? questions.slice(0, 5) : FALLBACK_QUESTIONS,
          topic: 'general'
        });
      } catch (error) {
        console.error('Error generating default questions:', error);
        return NextResponse.json({ 
          questions: FALLBACK_QUESTIONS,
          topic: 'general'
        });
      }
    }
    
    // If topic is specified, continue with the existing code
    // Generate embedding for the topic to find relevant content
    const topicEmbedding = await getEmbedding(topic);
    
    // Query Pinecone for relevant chunks using the topic embedding
    const queryResult = await querySimilarChunks(indexName, topicEmbedding, 3);
    console.log(`Query result for topic "${topic}":`, queryResult);
    
    if (!queryResult.success || queryResult.matches.length === 0) {
      return NextResponse.json({
        questions: FALLBACK_QUESTIONS,
        topic: topic,
        matchCount: 0
      });
    }
    
    // Extract text from the matches
    
    const textChunks = queryResult.matches.map(match => 
      match.metadata?.text || ""
      //@ts-ignore
    ).filter(text => text.length > 0);
    
    // Generate questions using Gemini LLM
    //@ts-ignore
    let questions = await generateQuestionsFromChunks(textChunks);
    questions = removeDuplicateQuestions(questions);
    
    // If we have fewer than 5 questions, append some topic-specific fallbacks
    if (questions.length < 5) {
      const topicFallbacks = [
        `What aspects of ${topic} are highlighted in this document?`,
        `How does the document characterize the role of ${topic}?`,
        `What challenges related to ${topic} are mentioned?`,
        `What solutions involving ${topic} are proposed?`,
        `How might ${topic} evolve according to this content?`
      ];
      
      const missingCount = 5 - questions.length;
      questions = [...questions, ...topicFallbacks.slice(0, missingCount)];
    }
    
    return NextResponse.json({
      questions: questions.slice(0, 5), // Limit to 5 questions
      topic,
      matchCount: queryResult.success ? queryResult.matches.length : 0
    });
    
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions', questions: FALLBACK_QUESTIONS },
      { status: 500 }
    );
  }
}
