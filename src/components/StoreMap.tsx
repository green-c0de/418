import { useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { ExternalLink, MapPin } from 'lucide-react';

interface StoreMapProps {
  apiKey: string;
  lat: number;
  lng: number;
  storeName: string;
  address: string;
}

function StoreMarkerWithWindow({
  position,
  storeName,
  address,
}: {
  position: { lat: number; lng: number };
  storeName: string;
  address: string;
}) {
  const [infoOpen, setInfoOpen] = useState(true);
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        onClick={() => setInfoOpen(true)}
        title={storeName}
      >
        <Pin background="#172B4D" borderColor="#F59E0B" glyphColor="#F59E0B" />
      </AdvancedMarker>
      {infoOpen && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={260}
          onCloseClick={() => setInfoOpen(false)}
        >
          <div className="p-1 text-xs text-[#252B36]">
            <p className="font-bold text-[#172B4D] text-sm">{storeName}</p>
            <p className="text-slate-600 mt-1">{address}</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function StoreMap({ apiKey, lat, lng, storeName, address }: StoreMapProps) {
  const position = {
    lat: Number.isFinite(lat) ? lat : 30.3342,
    lng: Number.isFinite(lng) ? lng : -9.4972,
  };

  if (!apiKey) {
    return (
      <div className="w-full h-[360px] rounded-2xl bg-[#F5F7FA] border border-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <MapPin className="w-10 h-10 text-[#172B4D]" />
        <div className="max-w-md space-y-1">
          <p className="font-display font-bold text-[#172B4D]">{storeName}</p>
          <p className="text-sm text-slate-600">{address}</p>
          <p className="text-xs font-mono-num text-slate-500">
            Coordonnées GPS : {position.lat.toFixed(4)}, {position.lng.toFixed(4)} (Aït Melloul)
          </p>
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg hover:opacity-95"
        >
          <span>Ouvrir dans Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-[360px] rounded-2xl overflow-hidden border border-slate-200">
      <APIProvider apiKey={apiKey} libraries={['marker']} language="fr" region="MA">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          defaultCenter={position}
          defaultZoom={14}
          gestureHandling="cooperative"
          style={{ width: '100%', height: '100%' }}
        >
          <StoreMarkerWithWindow
            position={position}
            storeName={storeName}
            address={address}
          />
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
