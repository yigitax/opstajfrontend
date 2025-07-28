import React from 'react';

const Legend = ({ visibility, onVisibilityChange }) => {
    const legendItems = [
        { name: 'Point', label: 'Points' },
        { name: 'LineString', label: 'Lines' },
        { name: 'Polygon', label: 'Polygons' },
    ];

    const handleVisibilityChange = (name) => {
        onVisibilityChange(prev => ({
            ...prev,
            [name]: !prev[name], // Mevcut durumun tersini yap (true ise false, false ise true)
        }));
    };

    return (
        <div className="legend">
            <h4>Layers</h4>
            {legendItems.map(item => (
                <div
                    key={item.name}
                    // Tıklandığında görünürlüğü değiştir ve CSS class'ını ayarla
                    onClick={() => handleVisibilityChange(item.name)}
                    className={`legend-item ${visibility[item.name] ? 'visible' : 'hidden'}`}
                >
                    {/* Her bir tip için görsel bir ikon (CSS ile stil verilecek) */}
                    <span className={`legend-icon ${item.name.toLowerCase()}`}></span>
                    {item.label}
                </div>
            ))}
        </div>
    );
};

export default Legend;