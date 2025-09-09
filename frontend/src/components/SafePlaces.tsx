import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    MapPin, 
    Navigation, 
    AlertTriangle,
    Loader2,
    Shield,
    Heart,
    Building2,
    Store
} from 'lucide-react';

// Define the structure of a place from the Google API
interface Place {
    place_id: string;
    name: string;
    vicinity: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
}

// Define the structure for a geographic location
interface Location {
    lat: number;
    lng: number;
}

const SafePlaces: React.FC = () => {
    // State management for the component
    const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchRadius, setSearchRadius] = useState(2000);
    
    // Refs for managing the Google Map instance and markers
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);

    const placeCategories = [
        { value: 'all', label: 'All Safe Places' },
        { value: 'police', label: 'Police Stations' },
        { value: 'hospital', label: 'Hospitals' },
        { value: 'fire_station', label: 'Fire Stations' },
        { value: 'pharmacy', label: 'Pharmacies' },
        { value: 'convenience_store', label: '24-Hour Stores' }
    ];

    // Effect hook to load the Google Maps script securely
    useEffect(() => {
        // --- ✅ CORRECTED: Use import.meta.env for Vite projects ---
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            setError('Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in your frontend .env.local file.');
            setLoading(false);
            return;
        }

        if (window.google && window.google.maps) {
            setMapLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setMapLoaded(true);
        script.onerror = () => {
            setError('Failed to load Google Maps. Check your API key and Google Cloud Console settings.');
        };
        document.head.appendChild(script);
    }, []);

    // Effect to initialize the map once the API script is loaded and we have a location
    useEffect(() => {
        if (mapLoaded && mapRef.current && currentLocation) {
            const map = new google.maps.Map(mapRef.current, {
                center: currentLocation,
                zoom: 14,
            });
            new google.maps.Marker({
                position: currentLocation,
                map,
                title: 'Your Location'
            });
            googleMapRef.current = map;
            addMarkersToMap(places); // Add markers for any places we might have already fetched
        }
    }, [mapLoaded, currentLocation, places]);

    // Effect to request the user's location when the component first mounts
    useEffect(() => {
        requestLocationPermission();
    }, []);

    const requestLocationPermission = () => {
        setLoading(true);
        setError(null);
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            setLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = { lat: position.coords.latitude, lng: position.coords.longitude };
                setCurrentLocation(location);
                fetchNearbyPlaces(location); // Fetch places right after getting location
            },
            () => {
                setError('Location access was denied. Please enable location permissions to use this feature.');
                setLoading(false);
            }
        );
    };

    // Function to fetch nearby places from your backend
    const fetchNearbyPlaces = async (location: Location) => {
        setLoading(true);
        setError(null);
        try {
            const categories = selectedCategory === 'all' ? ['police', 'hospital'] : [selectedCategory];
            let allPlaces: Place[] = [];

            const promises = categories.map(category =>
                fetch('http://localhost:8000/api/places/nearby', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lat: location.lat,
                        lng: location.lng,
                        radius: searchRadius,
                        type: category
                    })
                }).then(res => {
                    if (!res.ok) throw new Error(`API error for ${category}`);
                    return res.json();
                })
            );

            const results = await Promise.all(promises);
            results.forEach(result => {
                if (result.places) allPlaces.push(...result.places);
            });

            const uniquePlaces = allPlaces.filter((place, index, self) =>
                index === self.findIndex(p => p.place_id === place.place_id)
            );

            setPlaces(uniquePlaces);
        } catch (err) {
            setError('Failed to fetch nearby places. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Function to add place markers to the map
    const addMarkersToMap = (placesToAdd: Place[]) => {
        if (!googleMapRef.current) return;
        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
        
        placesToAdd.forEach((place, index) => {
            if (place.geometry?.location) {
                const marker = new google.maps.Marker({
                    position: place.geometry.location,
                    map: googleMapRef.current,
                    title: place.name,
                    label: `${index + 1}`
                });
                markersRef.current.push(marker);
            }
        });
    };

    // Function to open Google Maps directions in a new tab
    const getDirections = (place: Place) => {
        if (!currentLocation) return;
        const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${place.geometry.location.lat},${place.geometry.location.lng}`;
        window.open(url, '_blank');
    };

    // Handler to refresh the search
    const handleRefresh = () => {
        if (currentLocation) {
            fetchNearbyPlaces(currentLocation);
        } else {
            requestLocationPermission();
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Find Safe Places</h1>
                <p>Locate nearby emergency services and safe locations</p>
            </div>

            {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            
            {!currentLocation && loading && (
                 <Card><CardContent className="pt-6 text-center">
                    <div className="flex justify-center items-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Getting your location...</span>
                    </div>
                </CardContent></Card>
            )}

            {currentLocation && (
                <>
                    <Card>
                        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="category">Category</Label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {placeCategories.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="radius">Search Radius</Label>
                                <Select value={searchRadius.toString()} onValueChange={(val) => setSearchRadius(parseInt(val))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1000">1 km</SelectItem>
                                        <SelectItem value="2000">2 km</SelectItem>
                                        <SelectItem value="5000">5 km</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button onClick={handleRefresh} disabled={loading} className="w-full">
                                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Refresh'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Map View</CardTitle></CardHeader>
                            <CardContent>
                                {mapLoaded ? <div ref={mapRef} className="w-full h-96 rounded-lg border" /> : <div>Loading Map...</div>}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Safe Places</CardTitle><CardDescription>{places.length} places found</CardDescription></CardHeader>
                            <CardContent className="max-h-96 overflow-y-auto">
                                {loading && places.length === 0 ? <p>Searching for places...</p> : places.length > 0 ? (
                                    places.map((place) => (
                                        <div key={place.place_id} className="border rounded-lg p-4 mb-2">
                                            <h3 className="font-semibold">{place.name}</h3>
                                            <p className="text-sm text-gray-600">{place.vicinity}</p>
                                            <Button variant="outline" size="sm" onClick={() => getDirections(place)} className="mt-2">
                                                <Navigation className="w-4 h-4 mr-2" /> Directions
                                            </Button>
                                        </div>
                                    ))
                                ) : <p>No safe places found in this area.</p>}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
};

export default SafePlaces;