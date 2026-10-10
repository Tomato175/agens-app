export default function LoadingScreen() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute z-[-1]"
        style={{
          width: '800px',
          height: '800px',
          backgroundImage:
            'linear-gradient(to right, rgba(99,102,241,0.06) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(99,102,241,0.06) 1px, transparent 1px)',
          backgroundSize: '1rem 1rem',
          backgroundPosition: 'center center',
          filter: 'blur(1px)',
        }}
      />

      {/* Rotating glow "car" */}
      <div className="relative">
        {/* Outer glow */}
        <div
          className="absolute rounded-xl"
          style={{
            inset: '-30px',
            overflow: 'hidden',
            filter: 'blur(30px)',
            opacity: 0.5,
          }}
        >
          <div
            className="absolute"
            style={{
              width: '300px',
              height: '300px',
              top: '-60px',
              left: '-60px',
              background: 'conic-gradient(transparent, #cf30aa 10%, transparent 20%, transparent 50%, #402fb5 60%, transparent 70%)',
              animation: 'car-spin 3s linear infinite',
            }}
          />
        </div>

        {/* Border glow */}
        <div
          className="absolute rounded-xl"
          style={{
            inset: '-3px',
            overflow: 'hidden',
            filter: 'blur(1px)',
          }}
        >
          <div
            className="absolute"
            style={{
              width: '200px',
              height: '200px',
              top: '-20px',
              left: '-20px',
              background: 'conic-gradient(#1c191c, #cf30aa 8%, #1c191c 15%, #1c191c 50%, #402fb5 58%, #1c191c 65%)',
              animation: 'car-spin 4s linear infinite',
            }}
          />
        </div>

        {/* Center logo */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-[#0d0b16] ring-1 ring-indigo-500/20">
          <span className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
            A
          </span>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-500">Loading Agent...</p>

      <div className="mt-3 flex gap-1.5">
        <span className="stream-dot h-2 w-2 rounded-full bg-pink-400" />
        <span className="stream-dot h-2 w-2 rounded-full bg-violet-400" />
        <span className="stream-dot h-2 w-2 rounded-full bg-indigo-400" />
      </div>

      <style>{`
        @keyframes car-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
