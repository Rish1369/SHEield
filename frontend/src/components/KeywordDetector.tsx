import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, AlertTriangle, Settings, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface KeywordDetectorProps {
  onKeywordDetected: (keyword: string, confidence: number, transcription: string) => void;
  isEnabled?: boolean;
}

interface DetectedKeyword {
  phrase: string;
  confidence: number;
  timestamp: number;
  transcription: string;
}

const KeywordDetector: React.FC<KeywordDetectorProps> = ({ 
  onKeywordDetected, 
  isEnabled = true 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [detectedKeywords, setDetectedKeywords] = useState<DetectedKeyword[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [settings, setSettings] = useState({
    continuousMode: true,
    showTranscription: true,
    autoStart: false,
    sensitivity: 0.7
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  // Default trigger phrases
  const triggerPhrases = [
    'help me',
    'emergency',
    'danger',
    'sos',
    'call police',
    'need help',
    'assault',
    'fire',
    'accident',
    'robbery',
    'attack',
    'threat',
    'dangerous',
    'unsafe',
    'panic',
    'stop',
    'no',
    'don\'t',
    'leave me alone'
  ];

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsSupported(true);
        initializeRecognition();
      } else {
        setIsSupported(false);
        console.warn('Speech recognition not supported in this browser');
      }
    }
  }, []);

  // Initialize recognition settings
  const initializeRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    // Configure recognition
    recognition.continuous = settings.continuousMode;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    // Event handlers
    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      console.log('🎤 Speech recognition started');
    };

    recognition.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;
      console.log('🎤 Speech recognition ended');
      
      // Restart if in continuous mode and should be listening
      if (settings.continuousMode && isEnabled) {
        setTimeout(() => {
          if (isEnabled && !isListeningRef.current) {
            startListening();
          }
        }, 100);
      }
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      const fullTranscript = finalTranscript + interimTranscript;
      setTranscription(fullTranscript.trim());

      // Check for keywords in final results
      if (finalTranscript) {
        checkForKeywords(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        // Restart if no speech detected and in continuous mode
        if (settings.continuousMode && isEnabled) {
          setTimeout(() => {
            if (isEnabled && !isListeningRef.current) {
              startListening();
            }
          }, 1000);
        }
      }
    };

    recognition.onnomatch = () => {
      console.log('No speech recognition match');
    };
  }, [settings.continuousMode, isEnabled]);

  // Check transcription for trigger phrases
  const checkForKeywords = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    const detected: DetectedKeyword[] = [];

    for (const phrase of triggerPhrases) {
      if (lowerText.includes(phrase)) {
        const confidence = calculateConfidence(phrase, lowerText);
        
        if (confidence >= settings.sensitivity) {
          detected.push({
            phrase,
            confidence,
            timestamp: Date.now(),
            transcription: text
          });

          // Trigger callback
          onKeywordDetected(phrase, confidence, text);
          
          console.log(`🚨 Keyword detected: "${phrase}" (confidence: ${confidence})`);
        }
      }
    }

    if (detected.length > 0) {
      setDetectedKeywords(prev => [...detected, ...prev].slice(0, 10)); // Keep last 10
      setConfidence(Math.max(...detected.map(d => d.confidence)));
    }
  }, [triggerPhrases, settings.sensitivity, onKeywordDetected]);

  // Calculate confidence score for keyword detection
  const calculateConfidence = (phrase: string, text: string): number => {
    let confidence = 0.5; // Base confidence

    // Longer phrases get higher confidence
    if (phrase.length > 10) confidence += 0.1;
    if (phrase.length > 20) confidence += 0.1;

    // Check for repetition
    const occurrences = (text.match(new RegExp(phrase, 'gi')) || []).length;
    if (occurrences > 1) confidence += 0.2;

    // Check for urgency indicators
    const urgencyWords = ['now', 'immediately', 'urgent', 'quick', 'fast', 'emergency', 'help'];
    const hasUrgency = urgencyWords.some(word => text.includes(word));
    if (hasUrgency) confidence += 0.1;

    // Check for emphasis (exclamation marks, repeated letters)
    const emphasisPatterns = [
      /!+/, // Exclamation marks
      /\?+/, // Question marks
      /[A-Z]{3,}/, // ALL CAPS
      /[a-z]{10,}/ // Very long words
    ];
    
    const hasEmphasis = emphasisPatterns.some(pattern => pattern.test(text));
    if (hasEmphasis) confidence += 0.1;

    return Math.min(1.0, confidence);
  };

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current && isSupported && isEnabled) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }
  }, [isSupported, isEnabled]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop speech recognition:', error);
      }
    }
  }, []);

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Auto-start if enabled
  useEffect(() => {
    if (settings.autoStart && isEnabled && isSupported) {
      startListening();
    }
  }, [settings.autoStart, isEnabled, isSupported, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!isSupported) {
    return (
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <p>Speech recognition not supported in this browser. Try Chrome or Edge.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Detector Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-blue-600" />
            Keyword Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status and Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={isListening ? "default" : "secondary"}>
                {isListening ? 'Listening' : 'Stopped'}
              </Badge>
              <Badge variant="outline">
                {detectedKeywords.length} keywords detected
              </Badge>
            </div>
            
            <Button
              onClick={toggleListening}
              disabled={!isEnabled}
              size="sm"
              variant={isListening ? "destructive" : "default"}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          </div>

          {/* Confidence Meter */}
          {confidence > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Detection Confidence</span>
                <span className="font-medium">{(confidence * 100).toFixed(1)}%</span>
              </div>
              <Progress value={confidence * 100} className="h-2" />
            </div>
          )}

          {/* Transcription Display */}
          {settings.showTranscription && transcription && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Live Transcription</Label>
              <div className="p-3 bg-white rounded-md border text-sm text-gray-700 min-h-[60px]">
                {transcription || 'No speech detected...'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Detection Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="continuous-mode">Continuous Mode</Label>
            <Switch
              id="continuous-mode"
              checked={settings.continuousMode}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, continuousMode: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-transcription">Show Transcription</Label>
            <Switch
              id="show-transcription"
              checked={settings.showTranscription}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, showTranscription: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-start">Auto-start on Enable</Label>
            <Switch
              id="auto-start"
              checked={settings.autoStart}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, autoStart: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="sensitivity">Sensitivity: {Math.round(settings.sensitivity * 100)}%</Label>
              <input
                id="sensitivity"
                name="sensitivity" 
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={settings.sensitivity}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, sensitivity: parseFloat(e.target.value) }))
                }
                className="w-full"
                title={`Sensitivity level: ${Math.round(settings.sensitivity * 100)}%`}
                aria-describedby="sensitivity-description"
              />
              <p id="sensitivity-description" className="text-xs text-gray-500">
                Adjust to control how sensitive the detection is to trigger phrases (higher = more sensitive)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Detections */}
      {detectedKeywords.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Detections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detectedKeywords.map((detection, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-md">
                  <div>
                    <span className="font-medium text-red-800">{detection.phrase}</span>
                    <span className="text-sm text-red-600 ml-2">
                      ({(detection.confidence * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(detection.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trigger Phrases Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Trigger Phrases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {triggerPhrases.map((phrase, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {phrase}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Say any of these phrases to trigger an emergency alert
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeywordDetector;
