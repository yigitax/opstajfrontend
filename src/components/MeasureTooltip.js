import React, { useRef, useEffect } from 'react';
import { Overlay } from 'ol';

const MeasureTooltip = ({ map }) => {
    const tooltipRef = useRef();

    useEffect(() => {
        // map nesnesi henüz hazır değilse veya ref atanmamışsa bir şey yapma.
        if (!map || !tooltipRef.current) return;

        // OpenLayers Overlay nesnesini oluştur
        const measureTooltip = new Overlay({
            element: tooltipRef.current, // Hangi HTML elementini kullanacak
            offset: [0, -15], // İmlecin biraz üstünde
            positioning: 'bottom-center',
            stopEvent: false, // Olayların haritaya yayılmasına izin ver
            insertFirst: false,
        });

        // Overlay'i haritaya ekle
        map.addOverlay(measureTooltip);

        // Bu overlay'i dışarıdan erişilebilir yapmak için map nesnesine bir özellik olarak ekliyoruz
        map.set('measureTooltip', measureTooltip);

        // Bileşen ekrandan kaldırıldığında (cleanup) overlay'i haritadan temizle
        return () => {
            if (map.get('measureTooltip')) {
                map.removeOverlay(map.get('measureTooltip'));
            }
        };
    }, [map]); // Sadece map nesnesi değiştiğinde (genellikle ilk render'da) çalışır

    // Bu div, OpenLayers Overlay'i tarafından kullanılacak olan HTML elementidir.
    return <div ref={tooltipRef} className="ol-tooltip ol-tooltip-measure"></div>;
};

export default MeasureTooltip;