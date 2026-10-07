import React, { useState, useEffect } from 'react';
import { Sparkles, Landmark, MapPin, Radio, AlertCircle } from 'lucide-react';

interface DistrictCluster {
  id: string;
  name: string;
  nameTa: string;
  count: number;
  x: number;
  y: number;
  isLarge?: boolean;
  topIssue: string;
  talukSample: string;
}

interface HeritageSite {
  id: string;
  name: string;
  nameTa: string;
  category: string;
  era: string;
  x: number;
  y: number;
}

const DISTRICT_CLUSTERS: DistrictCluster[] = [
  { id: 'chennai', name: 'Chennai', nameTa: 'சென்னை', count: 30, x: 395, y: 130, isLarge: true, topIssue: 'Roads & Sanitation', talukSample: 'Royapuram, Ward 51' },
  { id: 'tiruvallur', name: 'Tiruvallur', nameTa: 'திருவள்ளூர்', count: 3, x: 368, y: 105, topIssue: 'Drainage Overflow', talukSample: 'Poonamallee' },
  { id: 'kanchipuram', name: 'Kanchipuram', nameTa: 'காஞ்சிபுரம்', count: 2, x: 372, y: 155, topIssue: 'Drinking Water', talukSample: 'Sriperumbudur' },
  { id: 'ranipet', name: 'Ranipet', nameTa: 'இராணிப்பேட்டை', count: 2, x: 340, y: 140, topIssue: 'Bus Stand Lighting', talukSample: 'Nemili Taluk' },
  { id: 'chengalpattu', name: 'Chengalpattu', nameTa: 'செங்கல்பட்டு', count: 3, x: 380, y: 185, topIssue: 'Street Lights', talukSample: 'Tambaram' },
  { id: 'dharmapuri', name: 'Dharmapuri', nameTa: 'தர்மபுரி', count: 4, x: 275, y: 200, topIssue: 'Pothole Repair', talukSample: 'Harur' },
  { id: 'salem', name: 'Salem', nameTa: 'சேலம்', count: 4, x: 288, y: 245, topIssue: 'Garbage Clearance', talukSample: 'Attur' },
  { id: 'erode', name: 'Erode', nameTa: 'ஈரோடு', count: 2, x: 245, y: 270, topIssue: 'Canal Desilting', talukSample: 'Bhavani' },
  { id: 'coimbatore', name: 'Coimbatore', nameTa: 'கோயம்புத்தூர்', count: 4, x: 198, y: 310, topIssue: 'Water Pipeline', talukSample: 'Gandhipuram' },
  { id: 'tiruppur', name: 'Tiruppur', nameTa: 'திருப்பூர்', count: 1, x: 240, y: 310, topIssue: 'Road Widening', talukSample: 'Avinashi' },
  { id: 'dindigul', name: 'Dindigul', nameTa: 'திண்டுக்கல்', count: 1, x: 268, y: 360, topIssue: 'Waste Segregation', talukSample: 'Palani' },
  { id: 'madurai', name: 'Madurai', nameTa: 'மதுரை', count: 5, x: 282, y: 405, topIssue: 'Street Lights & Drainage', talukSample: 'Anna Nagar' },
  { id: 'sivaganga', name: 'Sivaganga', nameTa: 'சிவகங்கை', count: 1, x: 320, y: 410, topIssue: 'Borewell Repair', talukSample: 'Karaikudi' },
  { id: 'virudhunagar', name: 'Virudhunagar', nameTa: 'விருதுநகர்', count: 1, x: 265, y: 440, topIssue: 'Pothole Fix', talukSample: 'Sivakasi' },
  { id: 'tirunelveli', name: 'Tirunelveli', nameTa: 'திருநெல்வேலி', count: 4, x: 252, y: 505, topIssue: 'Drinking Water Supply', talukSample: 'Palayamkottai' },
  { id: 'thoothukudi', name: 'Thoothukudi', nameTa: 'தூத்துக்குடி', count: 2, x: 290, y: 510, topIssue: 'Salt-pan Road Access', talukSample: 'Kovilpatti' },
  { id: 'kanyakumari', name: 'Kanyakumari', nameTa: 'கன்னியாகுமரி', count: 1, x: 238, y: 565, topIssue: 'Sea Wall Repair', talukSample: 'Nagercoil' },
];

const HERITAGE_SITES: HeritageSite[] = [
  { id: 'shore_temple', name: 'Shore Temple, Mahabalipuram', nameTa: 'கடற்கரைக் கோயில்', category: 'UNESCO World Heritage', era: 'Pallava Dynasty (725 CE)', x: 388, y: 175 },
  { id: 'brihadisvara', name: 'Brihadisvara Temple, Thanjavur', nameTa: 'தஞ்சைப் பெரிய கோயில்', category: 'Great Living Chola Temple', era: 'Chola Dynasty (1010 CE)', x: 340, y: 330 },
  { id: 'meenakshi', name: 'Meenakshi Amman Temple, Madurai', nameTa: 'மீனாட்சி சுந்தரேசுவரர் கோயில்', category: 'Historic Monument', era: 'Pandya / Nayak (1623 CE)', x: 280, y: 405 },
  { id: 'padmanabha', name: 'Padmanabhapuram Palace', nameTa: 'பத்மநாபபுரம் அரண்மனை', category: 'Wooden Architecture', era: 'Venad Kingdom (1601 CE)', x: 235, y: 555 },
  { id: 'ramanathaswamy', name: 'Ramanathaswamy Temple, Rameswaram', nameTa: 'இராமநாதசுவாமி கோயில்', category: '1000-Pillar Hall', era: 'Sethupathi Dynasties', x: 350, y: 450 },
  { id: 'nilgiri_railway', name: 'Nilgiri Mountain Railway', nameTa: 'நீலகிரி மலை இரயில்வே', category: 'UNESCO Heritage Train', era: 'Operational since 1908', x: 195, y: 270 },
];

const LIVE_TICKER_ITEMS = [
  { location: 'Thirumalpur Bus stand Nemilitaluk Ranipetdistrict', district: 'Ranipet', time: '4d ago', cat: 'Street Lighting' },
  { location: 'Royapuram Ward 51 Canal Road waste overflow', district: 'Chennai', time: '2h ago', cat: 'Garbage & Sanitation' },
  { location: 'Mettupalayam Main Road pothole near junction', district: 'Coimbatore', time: '5h ago', cat: 'Roads & Potholes' },
  { location: 'Simmakkal Periyar bus bay drinking tap leakage', district: 'Madurai', time: '1d ago', cat: 'Water Supply' },
  { location: 'Hasthampatti Ward 14 transformer spark hazard', district: 'Salem', time: '3d ago', cat: 'Electricity / Power' },
];

export const TamilNaduHeroMap: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'heritage'>('live');
  const [hoveredCluster, setHoveredCluster] = useState<DistrictCluster | null>(null);
  const [hoveredHeritage, setHoveredHeritage] = useState<HeritageSite | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<DistrictCluster | null>(null);
  const [tickerIndex, setTickerIndex] = useState(0);

  // Auto-rotate ticker every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % LIVE_TICKER_ITEMS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const currentTicker = LIVE_TICKER_ITEMS[tickerIndex];

  return (
    <div className="relative w-full max-w-[540px] mx-auto select-none">
      {/* Top Segmented Controls: Live Issues vs Heritage */}
      <div className="flex items-center justify-end mb-3 pr-2">
        <div className="inline-flex items-center rounded-full bg-white/90 dark:bg-stone-900/90 p-1 shadow-sm border border-stone-200 dark:border-stone-800 backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setActiveTab('live');
              setSelectedCluster(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'live'
                ? 'bg-rose-50 text-rose-950 font-bold shadow-2xs border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-100 dark:border-rose-800'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live issues</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('heritage');
              setSelectedCluster(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'heritage'
                ? 'bg-amber-50 text-amber-950 font-bold shadow-2xs border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-800'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Landmark className="h-3.5 w-3.5 text-amber-600" />
            <span>Heritage · மரபு</span>
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative w-full aspect-[480/580] bg-transparent flex items-center justify-center">
        {/* Subtle background glow for the map */}
        <div className="absolute inset-0 bg-radial from-rose-500/5 via-amber-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Tamil Nadu Geographic SVG with Taluk Boundaries */}
        <svg
          viewBox="120 70 320 530"
          className="w-full h-full filter drop-shadow-sm transition-all duration-300"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Soft inner shadow & gradients */}
            <linearGradient id="tnBoundaryFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbf7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#faf2ea" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="tnBoundaryFillDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1f1b18" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#29231e" stopOpacity="0.95" />
            </linearGradient>

            <filter id="badgeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#800000" floodOpacity="0.3" />
            </filter>

            <filter id="largeBadgeGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#800000" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Tamil Nadu Outer Boundary polygon */}
          <path
            d="
              M 358 92
              C 375 92, 400 108, 408 128
              C 412 142, 404 165, 396 182
              C 388 200, 386 215, 380 235
              C 376 250, 370 262, 362 278
              C 358 290, 362 305, 360 320
              C 358 335, 365 352, 362 368
              C 356 385, 342 398, 335 412
              C 330 422, 342 438, 355 448
              C 358 452, 352 458, 338 462
              C 325 466, 310 472, 298 485
              C 292 495, 295 515, 290 530
              C 285 545, 275 558, 258 572
              C 248 580, 238 588, 230 584
              C 224 578, 226 565, 220 550
              C 214 535, 205 520, 202 505
              C 198 485, 208 470, 218 450
              C 224 438, 228 420, 232 405
              C 235 390, 228 375, 222 360
              C 215 348, 198 335, 185 320
              C 172 308, 162 292, 172 278
              C 182 265, 205 258, 220 248
              C 238 238, 252 225, 260 210
              C 268 195, 275 180, 288 170
              C 305 155, 320 148, 332 135
              C 342 122, 350 102, 358 92
              Z
            "
            className="fill-[url(#tnBoundaryFill)] dark:fill-[url(#tnBoundaryFillDark)] stroke-[#800000] dark:stroke-rose-700/80"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />

          {/* District & Taluk internal lattice mesh in delicate red lines */}
          <g className="stroke-[#c2410c]/40 dark:stroke-rose-600/35" strokeWidth="0.8" fill="none">
            {/* Chennai - Tiruvallur - Kanchi sub-lines */}
            <path d="M 358 92 Q 380 120 375 150 Q 395 180 380 210" />
            <path d="M 370 120 L 406 130" />
            <path d="M 345 130 Q 375 145 395 155" />
            <path d="M 330 145 Q 365 170 382 185" />
            <path d="M 315 160 Q 345 185 365 205" />

            {/* Northern central / Vellore / Dharmapuri / Tiruvannamalai */}
            <path d="M 332 135 Q 310 170 295 210 Q 320 240 345 260" />
            <path d="M 288 170 Q 270 200 260 230" />
            <path d="M 265 210 Q 300 220 330 225" />
            <path d="M 260 235 Q 295 250 325 255" />
            <path d="M 252 225 Q 230 245 220 270" />

            {/* Western belt: Salem, Erode, Coimbatore, Nilgiris */}
            <path d="M 220 248 Q 250 270 280 275 Q 310 285 330 295" />
            <path d="M 172 278 Q 200 285 230 285 Q 260 290 280 300" />
            <path d="M 190 300 Q 220 310 245 320" />
            <path d="M 185 320 Q 210 335 240 345" />
            <path d="M 245 270 L 250 320 L 260 360" />
            <path d="M 280 275 L 285 330 L 290 375" />

            {/* Central / Delta: Trichy, Thanjavur, Cuddalore, Nagapattinam */}
            <path d="M 325 255 Q 350 270 370 285" />
            <path d="M 310 285 Q 340 300 365 315" />
            <path d="M 295 320 Q 325 335 355 345" />
            <path d="M 290 350 Q 320 360 345 375" />
            <path d="M 320 335 L 325 385" />
            <path d="M 345 335 L 348 395" />

            {/* Southern: Dindigul, Madurai, Sivaganga, Ramanathapuram */}
            <path d="M 240 345 Q 275 370 305 380 Q 335 395 350 415" />
            <path d="M 260 360 Q 280 395 295 425 Q 325 440 345 448" />
            <path d="M 232 405 Q 260 415 285 425 Q 315 435 335 450" />
            <path d="M 228 420 Q 255 435 280 445 Q 305 455 330 465" />
            <path d="M 282 405 L 285 450" />
            <path d="M 305 420 L 310 465" />

            {/* Far South: Virudhunagar, Tirunelveli, Tuticorin, Tenkasi, Kanyakumari */}
            <path d="M 218 450 Q 245 465 275 475 Q 300 485 320 495" />
            <path d="M 210 480 Q 235 495 260 505 Q 280 515 295 525" />
            <path d="M 205 515 Q 230 525 255 535 Q 275 545 285 555" />
            <path d="M 220 550 Q 240 560 255 568" />
            <path d="M 252 505 L 255 550" />
            <path d="M 270 480 L 275 535" />
          </g>

          {/* Rameswaram Island Spur */}
          <path
            d="M 335 448 Q 355 452 368 456 Q 358 462 338 460"
            className="fill-none stroke-[#800000] dark:stroke-rose-700/80"
            strokeWidth="1.2"
          />

          {/* MODE 1: LIVE ISSUES CLUSTER PINS */}
          {activeTab === 'live' && (
            <g className="district-clusters">
              {DISTRICT_CLUSTERS.map((cluster) => {
                const isHovered = hoveredCluster?.id === cluster.id;
                const isSelected = selectedCluster?.id === cluster.id;
                const r = cluster.isLarge ? 17 : 10.5;

                return (
                  <g
                    key={cluster.id}
                    className="cursor-pointer transition-transform duration-200"
                    onMouseEnter={() => setHoveredCluster(cluster)}
                    onMouseLeave={() => setHoveredCluster(null)}
                    onClick={() => setSelectedCluster(cluster)}
                  >
                    {/* Pulsing ring for large/active node (e.g. Chennai 30) */}
                    {cluster.isLarge && (
                      <circle
                        cx={cluster.x}
                        cy={cluster.y}
                        r={r + 5}
                        fill="none"
                        stroke="#800000"
                        strokeWidth="1.2"
                        opacity="0.35"
                        className="animate-ping"
                        style={{ transformOrigin: `${cluster.x}px ${cluster.y}px`, animationDuration: '3s' }}
                      />
                    )}

                    {/* Outer glow ring on hover/select */}
                    {(isHovered || isSelected) && (
                      <circle
                        cx={cluster.x}
                        cy={cluster.y}
                        r={r + 4}
                        fill="none"
                        stroke="#b91c1c"
                        strokeWidth="1.5"
                        opacity="0.8"
                      />
                    )}

                    {/* Main Circular Badge */}
                    <circle
                      cx={cluster.x}
                      cy={cluster.y}
                      r={r}
                      fill="#800000"
                      filter={cluster.isLarge ? 'url(#largeBadgeGlow)' : 'url(#badgeGlow)'}
                      className="transition-colors hover:fill-[#991b1b]"
                    />

                    {/* Number Count Label */}
                    <text
                      x={cluster.x}
                      y={cluster.y + (cluster.isLarge ? 4.5 : 3.5)}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={cluster.isLarge ? '13' : '10'}
                      fontWeight="bold"
                      fontFamily="Inter, system-ui, sans-serif"
                      className="pointer-events-none select-none"
                    >
                      {cluster.count}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* MODE 2: HERITAGE SITES PINS */}
          {activeTab === 'heritage' && (
            <g className="heritage-markers">
              {HERITAGE_SITES.map((site) => {
                const isHovered = hoveredHeritage?.id === site.id;
                return (
                  <g
                    key={site.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredHeritage(site)}
                    onMouseLeave={() => setHoveredHeritage(null)}
                  >
                    {/* Glowing golden circle */}
                    <circle
                      cx={site.x}
                      cy={site.y}
                      r={isHovered ? 13 : 9}
                      fill="#b45309"
                      stroke="#fef3c7"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                    <text
                      x={site.x}
                      y={site.y + 3}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      🏛
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* Hover / Selected District Floating Card */}
        {activeTab === 'live' && (hoveredCluster || selectedCluster) && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95"
            style={{
              top: `${Math.min(Math.max(((hoveredCluster || selectedCluster)!.y / 530) * 100, 10), 80)}%`,
              left: `${Math.min(Math.max(((hoveredCluster || selectedCluster)!.x / 320) * 80, 10), 75)}%`,
              transform: 'translate(-50%, -115%)',
            }}
          >
            <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white/95 dark:bg-stone-900/95 p-2.5 shadow-xl backdrop-blur-md min-w-[160px] text-xs">
              <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-1 mb-1.5">
                <span className="font-bold text-stone-900 dark:text-white">
                  {(hoveredCluster || selectedCluster)!.name}
                </span>
                <span className="font-tamil text-[10px] text-stone-400">
                  {(hoveredCluster || selectedCluster)!.nameTa}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-300">
                <span>Active Grievances:</span>
                <span className="font-bold text-[#800000] dark:text-rose-400">
                  {(hoveredCluster || selectedCluster)!.count}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-stone-400 truncate">
                {(hoveredCluster || selectedCluster)!.talukSample}
              </p>
              <div className="mt-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                Top: {(hoveredCluster || selectedCluster)!.topIssue}
              </div>
            </div>
          </div>
        )}

        {/* Heritage Hover Card */}
        {activeTab === 'heritage' && hoveredHeritage && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-150 animate-in fade-in"
            style={{
              top: `${Math.min(Math.max((hoveredHeritage.y / 530) * 100, 10), 80)}%`,
              left: `${Math.min(Math.max((hoveredHeritage.x / 320) * 80, 10), 75)}%`,
              transform: 'translate(-50%, -115%)',
            }}
          >
            <div className="rounded-xl border border-amber-200 bg-amber-50/95 dark:border-amber-800 dark:bg-stone-900/95 p-2.5 shadow-xl backdrop-blur-md min-w-[180px] text-xs">
              <p className="font-bold text-amber-950 dark:text-amber-100">{hoveredHeritage.name}</p>
              <p className="font-tamil text-[10px] text-amber-800 dark:text-amber-300">{hoveredHeritage.nameTa}</p>
              <div className="mt-1 flex items-center justify-between text-[10px] text-stone-600 dark:text-stone-300">
                <span className="font-semibold text-amber-700">{hoveredHeritage.category}</span>
                <span>{hoveredHeritage.era}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Live Grievance Ticker (Image 1 bottom-right) */}
      <div className="mt-2 flex items-center justify-end">
        <div className="flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 px-3.5 py-1.5 text-xs shadow-xs backdrop-blur-md max-w-full truncate">
          <span className="flex items-center gap-1 font-bold text-[10px] tracking-wider text-emerald-600 uppercase shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
          <span className="text-stone-300 dark:text-stone-700">〰</span>
          <span className="text-stone-700 dark:text-stone-200 truncate font-medium">
            {currentTicker.location}
          </span>
          <span className="text-stone-400 shrink-0">·</span>
          <span className="text-stone-500 shrink-0 font-medium">
            {currentTicker.district}
          </span>
          <span className="text-stone-400 shrink-0">·</span>
          <span className="text-stone-400 shrink-0 text-[11px]">
            {currentTicker.time}
          </span>
        </div>
      </div>
    </div>
  );
};
