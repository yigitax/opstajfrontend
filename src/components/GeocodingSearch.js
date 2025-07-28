import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const GeocodingSearch = ({ onLocationSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async (event) => {
        event.preventDefault();
        if (searchTerm.length < 3) {
            toast.info("Please enter at least 3 characters to search.");
            return;
        };

        setIsLoading(true);
        setResults([]);

        // Nominatim API URL'i, aramaları Türkiye ile sınırlar (countrycodes=tr)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${searchTerm}&countrycodes=tr&limit=5`;

        try {
            const response = await axios.get(url);
            if (response.data && response.data.length > 0) {
                setResults(response.data);
            } else {
                toast.warn("No results found for your search.");
            }
        } catch (error) {
            toast.error("Geocoding service is currently unavailable.");
            console.error("Geocoding error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResultClick = (result) => {
        const coords = [parseFloat(result.lon), parseFloat(result.lat)];
        onLocationSelect(coords); // Seçilen konumu App.js'e bildir
        setSearchTerm(result.display_name); // Input'u tam adres ile güncelle
        setResults([]); // Sonuç listesini temizle
    };

    return (
        <div className="geocoding-search">
            <form onSubmit={handleSearch}>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search for a location in Turkey..."
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? '...' : 'Search'}
                </button>
            </form>
            {results.length > 0 && (
                <ul className="search-results">
                    {results.map(result => (
                        <li key={result.place_id} onClick={() => handleResultClick(result)}>
                            {result.display_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GeocodingSearch;