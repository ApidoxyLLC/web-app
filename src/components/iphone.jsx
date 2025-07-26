'use client';

export default function Iphone({ os, icon, branding, color, width }) {
  return (
    <div
      style={{ backgroundColor: color, width }}
      className="relative w-full h-full aspect-[100/216] rounded-[45px] shadow-[0_0_2px_2px_rgba(255,255,255,0.1)] border-8 border-zinc-900 ml-1"
    >
      <div
        className="absolute left-1/2 transform -translate-x-1/2 z-20 rounded-b-lg"
        style={{
          width: '55%',
          height: '3%',
          backgroundColor: '#18181b',
        }}
      ></div>

      <div className="relative w-full h-full rounded-[37px] overflow-hidden flex items-center justify-center">
        {icon}
        <div className="absolute bottom-0 left-0 right-0 w-full aspect-[5/2]">
          {branding}
        </div>
      </div>

      <div className="absolute left-[-12px] top-20 w-[6px] h-8 bg-zinc-900 rounded-l-md shadow-md"></div>
      <div className="absolute left-[-12px] top-36 w-[6px] h-12 bg-zinc-900 rounded-l-md shadow-md"></div>
      <div className="absolute left-[-12px] top-52 w-[6px] h-12 bg-zinc-900 rounded-l-md shadow-md"></div>
      <div className="absolute right-[-12px] top-36 w-[6px] h-16 bg-zinc-900 rounded-r-md shadow-md"></div>
    </div>
  );
}
