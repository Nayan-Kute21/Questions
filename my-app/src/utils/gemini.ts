import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client
const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});


export async function generateQuestionFromChunk(textChunk: string): Promise<string> {
  try {
    const prompt = `
    You are an educational assessment expert specializing in creating thought-provoking questions.
    
    I'll provide you with a text chunk extracted from a document. Your task is to:
    
    1. Analyze the key concepts, facts, and insights in the text
    2. Generate ONE highly relevant question that can be answered using only this text
    3. Focus on questions that test understanding rather than simple fact recall
    4. Ensure the question is specific to this text and wouldn't work for generic content
    5. Make the question clear, concise, and directly related to the main points
    
    Here's the text chunk:
    
    "${textChunk}"
    
    Generate only the question text without any additional explanation or commentary.
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert in creating insightful questions from text. Respond with only the question, no explanations."
      }
    });

    // Log the response structure once to understand its format
    console.log("Gemini API response structure:", JSON.stringify(response, null, 2));

    // Extract text based on the actual structure
    let questionText = "What are the key points in this text?"; // Default fallback
    
    if (response) {
      // Check different possible locations for the text content
      if (response.text && typeof response.text === 'function') {
        //@ts-ignore
        questionText = response.text().trim();
      } else if (response.candidates && response.candidates[0]?.content?.parts) {
        // Access via candidates array if present
        const parts = response.candidates[0].content.parts;
        if (parts.length > 0 && parts[0].text) {
          questionText = parts[0].text.trim();
        }
      } else {
        // Log the structure for debugging
        console.warn("Could not find text in response, unexpected structure:", response);
      }
    }
    
    return questionText;
  } catch (error) {
    console.error("Error generating question with Gemini:", error);
    return "What insights can be drawn from this text?";
  }
}


export async function generateQuestionsFromChunks(
  textChunks: string[], 
  maxQuestions: number = 10
): Promise<string[]> {
  // Limit the number of chunks to process
  const chunksToProcess = textChunks.slice(0, maxQuestions);
  
  try {
    // Generate questions in parallel
    const questionPromises = chunksToProcess.map(chunk => 
      generateQuestionFromChunk(chunk)
    );
    
    // Wait for all questions to be generated
    const questions = await Promise.all(questionPromises);
    
    // Filter out any empty questions and return
    return questions.filter(q => q.trim().length > 0);
  } catch (error) {
    console.error("Error generating questions:", error);
    return ["What are the key points discussed in this document?"];
  }
}
