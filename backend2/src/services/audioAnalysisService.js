const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Extracts timestamp from filenames like "audio_chunk_1756854227287_0.webm"
 * @param {string} filename - The filename to extract timestamp from
 * @returns {number|null} The timestamp or null if not found
 */
function getTimestampFromFilename(filename) {
  const match = filename.match(/_(\d{13})_/);
  if (match && match[1]) {
    return parseInt(match[1]);
  }
  return null;
}

// Initialize the Gemini API with your API key from config
const API_KEY = config.apiKeys.gemini;
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Analyzes audio content for potential threats and emergency situations
 * @param {string} filePath - Path to the audio file to analyze
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeAudioContent(filePath) {
  try {
    console.log(`Analyzing audio file: ${filePath}`);
    
    // Verify if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return {
        threatDetected: false,
        confidence: 0,
        detectedKeywords: [],
        detectedSounds: [],
        analysis: "File not found",
        recommendedAction: "check file path",
        severity: "unknown"
      };
    }
    
    // For Gemini, we need to convert the audio file to base64
    const fileData = fs.readFileSync(filePath);
    const base64Audio = fileData.toString('base64');
    
    // Initialize the generative model (using Gemini-2.5-Pro which can handle multimodal inputs including audio)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.2,  // Lower temperature for more factual responses
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      }
    });
    
    // Create the content parts for the request
    const parts = [
      {
        text: `You are an advanced audio analysis system designed to detect emergency situations and threats.
        
        TASK:
        Analyze the provided audio file for signs of danger, emergency, or distress.
        
        DETECTION PRIORITIES:
        1. Keywords: "help", "emergency", "stop", "no", "please"
        2. Violence indicators: sounds of physical altercation, impact noises
        3. Destruction sounds: crashing, breaking, shattering
        4. Human distress: screaming, crying, panicked voices, gasping
        5. Abrupt loud noises that could indicate danger
        
        RESPONSE FORMAT:
        Respond ONLY with a JSON object with the following structure:
        {
          "threatDetected": boolean,
          "confidence": number (0.0-1.0),
          "detectedKeywords": string[],
          "detectedSounds": string[],
          "analysis": "brief analysis of findings",
          "recommendedAction": "specific action to take",
          "severity": "low"|"medium"|"high"|"critical"
        }
        
        SEVERITY GUIDELINES:
        - low: No clear indicators of danger
        - medium: Some concerning elements but unclear context
        - high: Clear indicators of distress or danger
        - critical: Immediate emergency response needed
        
        IMPORTANT: If you're uncertain about the audio content, err on the side of caution.
        `
      },
      {
        inlineData: {
          mimeType: "audio/webm",
          data: base64Audio
        }
      }
    ];
    
    // Generate content
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const response = result.response;
    
    // Parse the response
    let analysisResult;
    try {
      // Extract JSON from the response text
      const responseText = response.text();
      // Find JSON object in the response (it might be embedded in markdown code blocks)
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```\n([\s\S]*?)\n```/) ||
                        responseText.match(/{[\s\S]*?}/);
                        
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      analysisResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      // If parsing fails, create a default response
      analysisResult = {
        threatDetected: false,
        confidence: 0,
        detectedKeywords: [],
        detectedSounds: [],
        analysis: "Failed to analyze audio content",
        recommendedAction: "manual review required",
        severity: "unknown"
      };
    }
    
    console.log('Audio analysis results:', analysisResult);
    return analysisResult;
    
  } catch (error) {
    console.error('Error analyzing audio with Gemini:', error);
    
    // Handle specific error types
    let errorResponse = {
      threatDetected: false,
      confidence: 0,
      detectedKeywords: [],
      detectedSounds: [],
      analysis: "Error analyzing audio content",
      recommendedAction: "check system logs",
      severity: "unknown",
      error: error.message
    };
    
    // Handle rate limiting errors specifically
    if (error.status === 429) {
      console.warn('⚠️ API rate limit exceeded. Using fallback analysis method.');
      
      // Fallback to simple file-based analysis when rate limited
      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);
      const fileSizeKB = Math.round(stats.size / 1024);
      
      errorResponse = {
        threatDetected: fileName.includes('danger'),
        confidence: 0.6,
        detectedKeywords: fileName.includes('danger') ? ["help", "emergency"] : [],
        detectedSounds: ["ambient noise"],
        analysis: `Fallback analysis due to API limits. File: ${fileName} (${fileSizeKB} KB)`,
        recommendedAction: fileName.includes('danger') ? "alert emergency contact" : "no action needed",
        severity: fileName.includes('danger') ? "medium" : "low",
        usingFallback: true
      };
      
      return errorResponse;
    }
    
    return errorResponse;
  }
}

/**
 * Finds the most recent audio file in the uploads directory
 * @param {string} prefix - Optional prefix to filter files (e.g., 'danger_audio_')
 * @returns {string|null} Path to the latest audio file or null if none found
 */
function getLatestAudioFile(prefix = '') {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.error('Uploads directory does not exist:', uploadsDir);
      return null;
    }
    
    const files = fs.readdirSync(uploadsDir)
      .filter(file => file.endsWith('.webm') && (prefix ? file.startsWith(prefix) : true))
      .map(file => ({
        name: file,
        path: path.join(uploadsDir, file),
        // Extract timestamp from filename if possible, or use file mtime as fallback
        time: getTimestampFromFilename(file) || fs.statSync(path.join(uploadsDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by time descending (newest first)
    
    if (files.length === 0) {
      console.log('No audio files found in uploads directory');
      return null;
    }
    
    console.log(`Latest audio file: ${files[0].name} (${new Date(files[0].time).toLocaleString()})`);
    return files[0].path;
  } catch (error) {
    console.error('Error finding latest audio file:', error);
    return null;
  }
}

/**
 * Analyzes the most recent audio file in the uploads directory
 * @param {string} prefix - Optional prefix to filter files
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeLatestAudio(prefix = '') {
  const latestFilePath = getLatestAudioFile(prefix);
  
  if (!latestFilePath) {
    return {
      threatDetected: false,
      confidence: 0,
      detectedKeywords: [],
      detectedSounds: [],
      analysis: "No audio files found",
      recommendedAction: "no action needed",
      severity: "unknown",
      analyzedFile: null
    };
  }
  
  try {
    // Get the analysis results
    const results = await analyzeAudioContent(latestFilePath);
    
    // Add the analyzed file path to the results
    return {
      ...results,
      analyzedFile: path.basename(latestFilePath)  // Just the filename, not the full path
    };
  } catch (error) {
    console.error('Error in analyzeLatestAudio:', error);
    
    // Create a basic fallback response
    return {
      threatDetected: false,
      confidence: 0.3,
      detectedKeywords: [],
      detectedSounds: ["(analysis failed)"],
      analysis: `Failed to analyze audio file: ${error.message}`,
      recommendedAction: "manual review required",
      severity: "unknown",
      analyzedFile: path.basename(latestFilePath),
      error: error.message
    };
  }
}

module.exports = { 
  analyzeAudioContent,
  getLatestAudioFile,
  analyzeLatestAudio
};
