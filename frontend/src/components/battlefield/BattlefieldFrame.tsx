import type { ReactNode, RefObject } from 'react';
import { motion } from 'framer-motion';

export function BattlefieldFrame({
  gameRef,
  children,
}: {
  gameRef: RefObject<HTMLDivElement | null>;
  children?: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="battlefield-frame relative min-h-[300px] flex-1 overflow-hidden rounded-[34px] border-[5px] border-sky-100/60 bg-gradient-to-b from-cyan-200 via-sky-300 to-indigo-500 shadow-[0_16px_0_rgba(20,61,126,0.75),0_28px_70px_rgba(15,23,42,0.5)] min-[900px]:min-h-0"
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_30%_12%,rgba(255,255,255,0.9),transparent_10%),radial-gradient(circle_at_80%_8%,rgba(255,255,255,0.65),transparent_12%)]" />
      <div className="cloud-layer cloud-layer-a" />
      <div className="cloud-layer cloud-layer-b" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center">
        <div className="mt-3 rounded-b-[20px] rounded-t-xl border-2 border-white/35 bg-blue-950/64 px-5 py-2 text-center shadow-lg backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/80">Chiến trường</p>
          <p className="game-title text-lg font-black uppercase leading-none text-white">Đảo bay</p>
        </div>
      </div>
      <div id="phaser-game" ref={gameRef} className="absolute inset-0 z-10" />
      <div className="pointer-events-none absolute inset-0 z-30 rounded-[28px] ring-2 ring-inset ring-white/30" />
      {children}
    </motion.section>
  );
}
