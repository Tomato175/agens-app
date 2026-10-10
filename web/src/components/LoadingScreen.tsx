export default function LoadingScreen() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="truck-wrap">
          {/* Truck body */}
          <div className="truck-body">
            <svg width="130" height="60" viewBox="0 0 130 60" fill="none">
              <rect x="0" y="10" width="80" height="40" rx="4" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.5" />
              <rect x="8" y="18" width="64" height="24" rx="2" fill="#312e81" opacity="0.5" />
              <text x="40" y="34" textAnchor="middle" fill="#a78bfa" fontSize="10" fontWeight="bold" fontFamily="system-ui">AGENT</text>
              <path d="M80 20 L110 20 Q115 20 115 25 L115 50 L80 50 Z" fill="#312e81" stroke="#818cf8" strokeWidth="1.5" />
              <rect x="88" y="26" width="18" height="14" rx="2" fill="#818cf8" opacity="0.3" />
              <circle cx="112" cy="45" r="3" fill="#fbbf24" />
              <rect x="5" y="5" width="4" height="8" rx="1" fill="#475569" />
            </svg>
          </div>
          {/* Tires */}
          <div className="truck-tires">
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ animation: 'wheel-spin 0.8s linear infinite' }}>
              <circle cx="12" cy="12" r="10" fill="#0f172a" stroke="#334155" strokeWidth="2" />
              <circle cx="12" cy="12" r="4" fill="#475569" />
              <line x1="12" y1="2" x2="12" y2="6" stroke="#64748b" strokeWidth="1.5" />
              <line x1="12" y1="18" x2="12" y2="22" stroke="#64748b" strokeWidth="1.5" />
            </svg>
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ animation: 'wheel-spin 0.8s linear infinite' }}>
              <circle cx="12" cy="12" r="10" fill="#0f172a" stroke="#334155" strokeWidth="2" />
              <circle cx="12" cy="12" r="4" fill="#475569" />
              <line x1="12" y1="2" x2="12" y2="6" stroke="#64748b" strokeWidth="1.5" />
              <line x1="12" y1="18" x2="12" y2="22" stroke="#64748b" strokeWidth="1.5" />
            </svg>
          </div>
          {/* Road */}
          <div className="road-line" />
        </div>
        <p style={{ marginTop: '16px', fontSize: '12px', color: '#64748b' }}>Agent is loading...</p>
      </div>
      <style>{`
        .truck-wrap {
          width: 200px; height: 100px;
          display: flex; flex-direction: column;
          position: relative; align-items: center; justify-content: flex-end;
          overflow-x: hidden;
        }
        .truck-body {
          width: 130px; height: fit-content; margin-bottom: 6px;
          animation: truck-motion 1s linear infinite;
        }
        @keyframes truck-motion {
          0% { transform: translateY(0); }
          50% { transform: translateY(3px); }
          100% { transform: translateY(0); }
        }
        .truck-tires {
          width: 130px; display: flex; align-items: center;
          justify-content: space-between; padding: 0 10px 0 15px;
          position: absolute; bottom: 12px;
        }
        @keyframes wheel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .road-line {
          width: 200px; height: 1.5px;
          background: #334155; position: relative;
          bottom: 10px; border-radius: 3px;
        }
        .road-line::before {
          content: ""; position: absolute;
          width: 20px; height: 100%;
          background: #334155; right: -20%;
          border-radius: 3px;
          animation: road-anim 1.4s linear infinite;
          border-left: 10px solid rgba(255,255,255,0.25);
        }
        .road-line::after {
          content: ""; position: absolute;
          width: 10px; height: 100%;
          background: #334155; right: -45%;
          border-radius: 3px;
          animation: road-anim 1.4s linear infinite;
          border-left: 4px solid rgba(255,255,255,0.15);
        }
        @keyframes road-anim {
          0% { transform: translateX(0); }
          100% { transform: translateX(-350px); }
        }
      `}</style>
    </div>
  );
}
