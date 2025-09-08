import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, MapPin, Volume2, FileText, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// This interface matches the data structure from your MongoDB 'alertevents' collection.
interface AlertEvent {
  _id: string;
  createdAt: string; // The backend provides 'createdAt'
  status: 'new' | 'acknowledged' | 'resolved' | 'false_alarm';
  geminiAnalysis: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    analysis: string;
    detectedSounds: string[];
  };
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  audioUrl: string;
}

const AlertHistory: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlertHistory = async () => {
      // This hardcoded ID matches the one in your WebSocket controller.
      // In a full application, you would get this from the logged-in user's state.
      const userId = 'USER_ID';

      try {
        setIsLoading(true);
        setError(null);
        console.log(`Fetching alert history for user: ${userId}`);
        
        // Fetch data from your backend API
        const response = await fetch(`http://localhost:8000/api/alerts/user/${userId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const data = await response.json();
        setAlerts(data.alerts || []); // Ensure alerts is always an array
        console.log(`Received ${data.alerts.length} historical alerts.`);

      } catch (err) {
        console.error('Failed to fetch alert history:', err);
        setError('Could not load alert history. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlertHistory();
  }, []); // The empty array ensures this effect runs only once when the component mounts.

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-gray-400 text-white';
    }
  };
  
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  // Group alerts by date for a structured display
  const groupedAlerts = alerts.reduce((groups, alert) => {
    const date = formatDate(alert.createdAt).date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(alert);
    return groups;
  }, {} as Record<string, AlertEvent[]>);

  // --- Conditional Rendering for Loading and Error States ---
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2">Loading History...</p>
        </div>
    );
  }

  if (error) {
    return (
        <Card className="p-8 text-center bg-destructive/10 border-destructive">
            <div className="text-destructive">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">An Error Occurred</h3>
                <p className="text-sm">{error}</p>
            </div>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Alert History</h2>
        <p className="text-sm text-muted-foreground">View past safety events and AI summaries</p>
      </div>

      {/* --- Render the list of historical alerts --- */}
      <div className="space-y-4">
        {Object.entries(groupedAlerts).map(([date, dayAlerts]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">{date}</h3>
            </div>
            <div className="space-y-3 ml-6">
              {dayAlerts.map((alert) => {
                const formatted = formatDate(alert.createdAt);
                return (
                  <Card key={alert._id} className="transition-all hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <CardTitle className="text-base">AI Detected</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{formatted.time}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getSeverityColor(alert.geminiAnalysis.severity)}>
                          {alert.geminiAnalysis.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Location Detected</p>
                          <p className="text-xs text-muted-foreground">
                            {alert.location.coordinates[1].toFixed(4)}, {alert.location.coordinates[0].toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Volume2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Audio Detection</p>
                          <p className="text-xs text-muted-foreground">{alert.geminiAnalysis.detectedSounds.join(', ') || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">AI Analysis</p>
                          <p className="text-xs text-muted-foreground">{alert.geminiAnalysis.analysis}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Button variant="link" size="sm" asChild>
                            <a href={alert.audioUrl} target="_blank" rel="noopener noreferrer">Listen to Audio</a>
                        </Button>
                        <Badge variant="outline" className="text-xs capitalize">
                          {alert.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {alerts.length === 0 && !isLoading && (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Alerts Yet</h3>
            <p className="text-sm">Your safety history will appear here when events are detected</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AlertHistory;