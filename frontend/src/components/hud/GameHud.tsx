import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

import { EnergyMeter, GameButton, IconButton, ResourcePill } from '../ui/GamePrimitives';
import { cx } from '../../utils/cx';

const AMMO_LABELS: Record<string, { name: string; icon: string }> = {
  WOOD: { name: 'Đạn gỗ', icon: 'GỖ' },
  STONE: { name: 'Đạn đá', icon: 'ĐÁ' },
  IRON: { name: 'Đạn sắt', icon: 'SẮT' },
  FIRE: { name: 'Đạn lửa', icon: 'LỬA' },
  ACID: { name: 'Đạn acid', icon: 'AX' },
  CLUSTER: { name: 'Đạn chùm', icon: 'CH' },
  VOID: { name: 'Đạn hư không', icon: 'VOID' },
};

function shortenAddress(value?: string) {
  if (!value) return 'Chưa kết nối';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function CrownIcon() {
  return (
    <span className="relative block h-5 w-6">
      <span className="absolute bottom-0 left-0 h-3 w-full rounded-b-md rounded-t-sm bg-current" />
      <span className="absolute left-0 top-0 h-3 w-3 rotate-45 rounded-sm bg-current" />
      <span className="absolute left-2 top-[-2px] h-4 w-4 rotate-45 rounded-sm bg-current" />
      <span className="absolute right-0 top-0 h-3 w-3 rotate-45 rounded-sm bg-current" />
    </span>
  );
}

function BoltIcon() {
  return (
    <span className="block h-6 w-4 skew-x-[-12deg] bg-current [clip-path:polygon(54%_0,100%_0,62%_42%,100%_42%,28%_100%,42%_55%,0_55%)]" />
  );
}

function BellIcon() {
  return (
    <span className="relative block h-5 w-5">
      <span className="absolute left-1 top-1 h-3.5 w-3 rounded-t-full rounded-b-sm bg-current" />
      <span className="absolute bottom-0 left-0.5 h-1 w-4 rounded-full bg-current" />
      <span className="absolute bottom-[-3px] left-2 h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

function GearIcon() {
  return (
    <span className="relative grid h-5 w-5 place-items-center rounded-full border-[5px] border-current">
      <span className="absolute h-1.5 w-6 rounded-full bg-current" />
      <span className="absolute h-6 w-1.5 rounded-full bg-current" />
      <span className="h-2 w-2 rounded-full bg-blue-950" />
    </span>
  );
}

export function GameHud({
  accountAddress,
  gold,
  energy,
  canClaim,
  regenSecondsDisplay,
  selectedAmmo,
  selectedAmmoCount,
  onClaimDaily,
  onBuyEnergy,
  connectButton,
}: {
  accountAddress?: string;
  gold: number;
  energy: number;
  canClaim: boolean;
  regenSecondsDisplay: number;
  selectedAmmo: string;
  selectedAmmoCount: number;
  onClaimDaily: () => void;
  onBuyEnergy: () => void;
  connectButton: ReactNode;
}) {
  const isConnected = Boolean(accountAddress);
  const ammo = AMMO_LABELS[selectedAmmo] || { name: selectedAmmo, icon: selectedAmmo };

  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative z-20 rounded-[24px] border-2 border-white/25 bg-gradient-to-r from-blue-950/88 via-indigo-950/82 to-violet-950/88 p-2 shadow-[0_10px_0_rgba(19,24,74,0.55),0_18px_44px_rgba(15,23,42,0.42)] backdrop-blur-xl sm:rounded-[28px] sm:p-3"
    >
      <div className="pointer-events-none absolute inset-x-6 top-2 h-7 rounded-full bg-white/18 blur-[1px]" />

      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border-2 border-cyan-100/25 bg-sky-950/54 px-3 py-2 shadow-inner shadow-white/10 sm:gap-3 sm:px-4">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-b from-amber-200 to-orange-500 text-amber-950 shadow-lg shadow-amber-950/35 sm:h-11 sm:w-11"
            >
              <CrownIcon />
            </motion.div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/75">Kho vũ khí trên không</p>
              <h1 className="game-title text-lg font-black uppercase leading-none text-white sm:text-2xl">
                Pháo Đài SUI
              </h1>
            </div>
          </div>

          {isConnected && (
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(150px,auto)_minmax(190px,auto)_minmax(150px,auto)]">
              <ResourcePill label="Vàng" value={gold.toLocaleString()} tone="gold" icon={<CrownIcon />} />
              <EnergyMeter
                value={energy}
                regenLabel={energy < 50 ? `+1 sau ${regenSecondsDisplay}s` : 'Đã đầy năng lượng'}
              />
              <ResourcePill
                label="Đạn hiện tại"
                value={`x${selectedAmmoCount}`}
                tone="blue"
                icon={<span className="text-[10px] leading-none">{ammo.icon}</span>}
                sublabel={ammo.name}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
          {isConnected && (
            <div className="flex flex-wrap items-center gap-2">
              <GameButton onClick={onClaimDaily} disabled={!canClaim} variant={canClaim ? 'green' : 'ghost'} className="min-w-[112px] px-3 py-2 sm:min-w-[140px] sm:px-4 sm:py-3">
                {canClaim ? 'Nhận hằng ngày' : 'Đã nhận'}
              </GameButton>
              <GameButton onClick={onBuyEnergy} disabled={energy > 40} variant="blue" className="min-w-[128px] px-3 py-2 sm:min-w-[150px] sm:px-4 sm:py-3">
                <BoltIcon />
                +10 Năng lượng
              </GameButton>
            </div>
          )}

          <div className="flex items-center gap-2">
            <IconButton label="Thông báo" className="text-yellow-200">
              <BellIcon />
            </IconButton>
            <IconButton label="Cài đặt" className="text-cyan-100">
              <GearIcon />
            </IconButton>
          </div>

          <div
            className={cx(
              'game-wallet hidden min-w-[168px] rounded-2xl border-2 border-white/25 bg-blue-950/56 px-2 py-2 text-center shadow-inner shadow-black/25 sm:block',
              !isConnected && 'animate-soft-pulse',
            )}
          >
            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/65">
              {shortenAddress(accountAddress)}
            </p>
            {connectButton}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
