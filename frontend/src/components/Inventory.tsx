import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from '@mysten/dapp-kit';

import { toast } from 'sonner';

import {
  GameplayTx,
  type ChestOpenType,
} from '../services/gameplayTx';

import {
  PACKAGE_ID,
  getChestOwnedObjectsParams,
  getWeaponOwnedObjectsParams,
  invalidateChestInventory,
  scheduleChestInventoryRefetch,
} from '../suiChest';
import { GameButton, GamePanel, PanelTitle } from './ui/GamePrimitives';
import { cx } from '../utils/cx';
import { API_BASE } from '../config/api';
import type { AmmoType } from '../game/createScene';

const GAME_POOL_ID = import.meta.env.VITE_GAME_POOL_ID;

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────

function shortenId(value: string) {
  if (!value) return '';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

const RARITY_MAP: Record<
  number,
  {
    name: string;
    color: string;
    bg: string;
    text: string;
    icon: string;
  }
> = {
  1: {
    name: 'Sứt mẻ',
    color: 'border-slate-300/70',
    bg: 'bg-slate-700/70',
    text: 'text-slate-200',
    icon: 'MẺ',
  },

  2: {
    name: 'Thường',
    color: 'border-emerald-300/80',
    bg: 'bg-emerald-700/70',
    text: 'text-emerald-100',
    icon: 'TH',
  },

  3: {
    name: 'Hiếm',
    color: 'border-sky-200/90',
    bg: 'bg-sky-700/70',
    text: 'text-sky-100',
    icon: 'HI',
  },

  4: {
    name: 'Huyền thoại',
    color: 'border-amber-200',
    bg: 'bg-amber-600/75',
    text: 'text-amber-100',
    icon: 'HT',
  },
};

const AMMO_ITEMS: Record<
  AmmoType,
  {
    name: string;
    itemType: string;
    rarity: number;
    icon: string;
    description: string;
  }
> = {
  WOOD: {
    name: 'Đạn gỗ',
    itemType: 'Đạn / Projectile',
    rarity: 1,
    icon: 'GỖ',
    description: 'Loại đạn cơ bản cho máy bắn đá. Sát thương thấp nhưng ổn định.',
  },
  STONE: {
    name: 'Đạn đá',
    itemType: 'Đạn / Projectile',
    rarity: 2,
    icon: 'ĐÁ',
    description: 'Đạn đá nặng, gây sát thương tốt và rung tường khi va chạm.',
  },
  IRON: {
    name: 'Đạn sắt',
    itemType: 'Đạn / Projectile',
    rarity: 3,
    icon: 'SẮT',
    description: 'Đạn sắt xuyên phá mạnh, phù hợp để kết liễu tường thành.',
  },
  FIRE: {
    name: 'Đạn lửa',
    itemType: 'Đạn / Consumable',
    rarity: 3,
    icon: 'LỬA',
    description: 'Đạn gây cháy, tạo hiệu ứng thiêu đốt theo thời gian.',
  },
  ACID: {
    name: 'Đạn acid',
    itemType: 'Đạn / Consumable',
    rarity: 3,
    icon: 'AX',
    description: 'Đạn ăn mòn làm mục tiêu dễ nhận thêm sát thương.',
  },
  CLUSTER: {
    name: 'Đạn chùm',
    itemType: 'Đạn / Projectile',
    rarity: 4,
    icon: 'CH',
    description: 'Đạn tách mảnh trên không để phủ nhiều điểm va chạm.',
  },
  VOID: {
    name: 'Đạn hư không',
    itemType: 'Đạn / Consumable',
    rarity: 4,
    icon: 'VOID',
    description: 'Đạn hiếm gây hiệu ứng hư không và chặn hồi phục trong thời gian ngắn.',
  },
};

type RewardItem = {
  id?: string;
  name: string;
  rarity: number;
  quantity: number;
  icon: string;
  description?: string;
};

// ─────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────

function CompactInventorySlot({
  icon,
  label,
  count,
  level,
  rarity = 2,
  active = false,
  onClick,
}: {
  icon: string;
  label: string;
  count?: number;
  level?: number | string;
  rarity?: number;
  active?: boolean;
  onClick: () => void;
}) {
  const style = RARITY_MAP[rarity] || RARITY_MAP[2];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      className={cx(
        'group relative h-full min-h-0 w-full overflow-hidden rounded-[20px] border-[3px] p-2 text-center shadow-[0_7px_0_rgba(8,13,46,0.48),0_14px_28px_rgba(15,23,42,0.32)] transition-all',
        'bg-gradient-to-b from-white/24 via-blue-900/48 to-blue-950/86',
        active ? 'border-white ring-4 ring-cyan-200/35' : style.color,
      )}
    >
      <div className="absolute inset-x-2 top-1 h-1/3 rounded-full bg-white/18" />
      <div className={cx('absolute inset-2 rounded-[18px] opacity-45 blur-xl transition-opacity group-hover:opacity-70', style.bg)} />

      <div className="relative z-10 flex h-full min-h-0 flex-col items-center justify-center gap-1">
        <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 bg-gradient-to-b text-xs font-black shadow-inner sm:h-12 sm:w-12 sm:text-sm', style.color, style.bg, style.text)}>
          {icon}
        </div>
        <p className="max-w-full truncate text-[10px] font-black uppercase tracking-wide text-cyan-50/88 sm:text-[11px]">
          {label}
        </p>
      </div>

      {count != null && (
        <div className={cx(
          'absolute right-1.5 top-1.5 z-20 rounded-full border-2 border-white/70 px-2 py-0.5 text-[10px] font-black text-white shadow-lg',
          count > 0 ? 'bg-red-500' : 'bg-slate-600',
        )}>
          x{count}
        </div>
      )}
      {level != null && (
        <div className="absolute bottom-1.5 left-1.5 z-20 rounded-full border border-white/50 bg-blue-950/82 px-2 py-0.5 text-[9px] font-black text-cyan-100 shadow-lg">
          Lv.{level}
        </div>
      )}
    </motion.button>
  );
}

function EmptyInventorySlot() {
  return (
    <div className="grid h-full min-h-0 place-items-center rounded-[20px] border-2 border-dashed border-cyan-100/24 bg-blue-950/34 p-2 text-[10px] font-black uppercase tracking-wider text-cyan-100/42 shadow-inner shadow-black/25">
      Trống
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  colorClass,
  icon,
}: any) {
  const percentage =
    Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end px-1">
        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-cyan-100/70">
          {icon} {label}
        </span>

        <span className="font-mono text-sm font-black text-white">
          {value}
        </span>
      </div>

      <div className="h-4 overflow-hidden rounded-full border border-white/25 bg-blue-950/80 p-0.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full rounded-full ${colorClass}`}
        />
      </div>
    </div>
  );
}

function EquipmentRail() {
  const slots = [
    ['Vũ khí', 'VK'],
    ['Lõi', 'LÕI'],
    ['Bùa', 'BÙA'],
    ['Di vật', 'DV'],
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map(([label, glyph]) => (
        <div
          key={label}
          title={label}
          className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-cyan-100/28 bg-blue-950/45 text-[10px] font-black text-cyan-100/55 shadow-inner shadow-black/25"
        >
          {glyph}
        </div>
      ))}
    </div>
  );
}

function ItemTicketModal({
  selectedItem,
  chestCount,
  keyCount,
  isOpening,
  isProcessing,
  selectedAmmo,
  onClose,
  onOpenChest,
  onSelectAmmo,
  onSell,
}: {
  selectedItem: any;
  chestCount: number;
  keyCount: number;
  isOpening: boolean;
  isProcessing: boolean;
  selectedAmmo: AmmoType;
  onClose: () => void;
  onOpenChest: (chestType: ChestOpenType, amount: number) => void;
  onSelectAmmo: (ammoType: AmmoType) => void;
  onSell: () => void;
}) {
  if (!selectedItem) return null;

  const selectedFields =
    selectedItem?.data?.content?.fields;
  const isAmmo = selectedItem.type === 'ammo';
  const ammoType = selectedItem.ammoType as AmmoType | undefined;
  const ammoDetails = ammoType ? AMMO_ITEMS[ammoType] : null;

  const selectedRarity =
    RARITY_MAP[isAmmo ? ammoDetails?.rarity : selectedFields?.rarity] ||
    RARITY_MAP[2];

  const isChest = selectedItem.type === 'chest';
  const isKey = selectedItem.type === 'key';
  const title = isChest
    ? 'Rương chiến lợi phẩm'
    : isKey
      ? 'Chìa khóa EPIC'
      : isAmmo
        ? ammoDetails?.name || 'Đạn'
        : selectedRarity.name;
  const rarity = isChest
    ? RARITY_MAP[3]
    : isKey
      ? RARITY_MAP[4]
      : selectedRarity;
  const quantity = isChest ? chestCount : isKey ? keyCount : isAmmo ? selectedItem.quantity || 0 : 1;
  const isSelectedAmmo = isAmmo && ammoType === selectedAmmo;

  return (
    <motion.div
      className="modal-scroll fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-blue-950/72 p-3 backdrop-blur-md sm:p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative my-auto flex max-h-[calc(100svh-1.5rem)] min-h-[min(680px,calc(100svh-1.5rem))] w-full max-w-[580px] flex-col overflow-hidden rounded-[34px] border-4 border-yellow-100/70 bg-gradient-to-b from-sky-600/96 via-indigo-950/98 to-violet-950/98 p-4 text-white shadow-[0_16px_0_rgba(69,26,3,0.45),0_32px_90px_rgba(15,23,42,0.7)] sm:min-h-0 sm:p-6"
        initial={{ y: 42, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 28, scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-8 top-2 h-12 rounded-full bg-white/22 blur-[2px]" />
        <div className="pointer-events-none absolute -left-16 top-16 h-44 w-44 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-24 h-52 w-52 rounded-full bg-amber-300/25 blur-3xl" />

        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-2xl border-2 border-white/30 bg-blue-950/70 text-lg font-black text-white shadow-[0_5px_0_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5"
        >
          ×
        </button>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-1 pt-6 text-center no-scrollbar sm:px-3">
          <div className="mx-auto mb-3 inline-flex rounded-full border-2 border-white/30 bg-blue-950/54 px-4 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/85">
            {rarity.name}
          </div>

          <h3 className="game-title text-3xl font-black uppercase leading-none text-white sm:text-4xl">
            {title}
          </h3>

          <div className="relative mx-auto my-5 grid h-40 w-40 place-items-center sm:h-48 sm:w-48">
            <div className={cx('absolute inset-0 animate-glow-pulse rounded-full opacity-70 blur-2xl', rarity.bg)} />
            <motion.div
              animate={{ y: [0, -8, 0], rotate: isChest ? [0, -1.5, 1.5, 0] : [0, 0, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className={cx(
                'relative grid h-32 w-32 place-items-center rounded-[34px] border-4 bg-gradient-to-b text-4xl font-black shadow-[0_12px_0_rgba(8,13,46,0.46),0_24px_44px_rgba(15,23,42,0.36)] sm:h-40 sm:w-40',
                rarity.color,
                rarity.bg,
                rarity.text,
              )}
            >
              {isChest ? (
                <div className="relative h-20 w-24 sm:h-24 sm:w-28">
                  <div className="absolute inset-x-1 top-1 h-9 rounded-t-[24px] border-4 border-amber-950/65 bg-gradient-to-b from-yellow-200 to-amber-500" />
                  <div className="absolute inset-x-0 bottom-0 h-16 rounded-[20px] border-4 border-amber-950/75 bg-gradient-to-b from-orange-400 to-amber-700 shadow-inner" />
                  <div className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border-[3px] border-amber-950/70 bg-yellow-200 text-base text-amber-950">
                    R
                  </div>
                </div>
              ) : isKey ? (
                'K'
              ) : isAmmo ? (
                ammoDetails?.icon
              ) : (
                selectedRarity.icon
              )}
            </motion.div>
            <div className="absolute bottom-0 right-2 rounded-full border-2 border-white/80 bg-red-500 px-3 py-1 text-sm font-black text-white shadow-lg">
              x{quantity}
            </div>
          </div>

          <p className="mx-auto max-w-sm text-sm font-bold leading-relaxed text-cyan-50/82">
            {isChest
              ? 'Một rương chiến lợi phẩm có thể chứa trang bị, vật phẩm hiếm và phần thưởng on-chain cho kho vũ khí.'
              : isKey
                ? 'Chìa khóa dùng để kích hoạt rương EPIC khi tính năng tương ứng khả dụng.'
                : isAmmo
                  ? ammoDetails?.description
                  : 'Trang bị có thể dùng trong đội hình hoặc rao bán tại chợ giao dịch.'}
          </p>

          <div className="mt-5 grid gap-3 rounded-[24px] border-2 border-white/16 bg-blue-950/45 p-3 text-left shadow-inner shadow-black/30">
            {isChest ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2">
                  <span className="text-xs font-black uppercase text-cyan-100/70">Xem trước phần thưởng</span>
                  <span className="text-xs font-black text-yellow-200">Trang bị / Vàng / Vật phẩm</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2">
                  <span className="text-xs font-black uppercase text-cyan-100/70">Số rương</span>
                  <span className="font-mono text-lg font-black text-white">{chestCount}</span>
                </div>
              </>
            ) : isKey ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2">
                <span className="text-xs font-black uppercase text-cyan-100/70">Công dụng</span>
                <span className="text-xs font-black text-sky-100">Mở rương EPIC</span>
              </div>
            ) : isAmmo ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2">
                  <span className="text-xs font-black uppercase text-cyan-100/70">Loại</span>
                  <span className="text-xs font-black text-sky-100">{ammoDetails?.itemType || 'Đạn'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2">
                  <span className="text-xs font-black uppercase text-cyan-100/70">Số lượng</span>
                  <span className="font-mono text-lg font-black text-white">{quantity}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2">
                  <span className="text-xs font-black uppercase text-cyan-100/70">Trạng thái</span>
                  <span className={cx('text-xs font-black', isSelectedAmmo ? 'text-lime-200' : 'text-cyan-100')}>
                    {isSelectedAmmo ? 'Đang trang bị' : 'Có thể chọn cho trận'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <StatBar
                  label="Sát thương"
                  value={selectedFields?.damage || 0}
                  max={1000}
                  colorClass="bg-gradient-to-r from-orange-300 to-red-500"
                  icon="ST"
                />
                <StatBar
                  label="Độ bền"
                  value={selectedFields?.durability || 0}
                  max={255}
                  colorClass="bg-gradient-to-r from-lime-300 to-emerald-500"
                  icon="ĐB"
                />
                <p className="text-center font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-100/55">
                  {shortenId(selectedItem.data?.objectId || '')}
                </p>
              </>
            )}
          </div>

          <div className="mt-auto grid gap-3 pt-5">
            {isChest ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <GameButton
                  onClick={() => onOpenChest('normal', 1)}
                  disabled={isOpening || chestCount < 1}
                  variant="green"
                  className="min-h-14 w-full text-sm"
                >
                  MỞ 1 RƯƠNG
                </GameButton>
                <GameButton
                  onClick={() => onOpenChest('normal', chestCount)}
                  disabled={isOpening || chestCount < 2}
                  variant="gold"
                  className="min-h-14 w-full text-sm"
                >
                  MỞ x{chestCount}
                </GameButton>
              </div>
            ) : isKey ? (
              <GameButton
                onClick={onClose}
                variant="blue"
                className="min-h-14 w-full text-sm"
              >
                ĐÃ HIỂU
              </GameButton>
            ) : isAmmo && ammoType ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <GameButton
                  onClick={() => toast.info('Chức năng sử dụng vật phẩm chưa được kết nối.')}
                  disabled={quantity <= 0}
                  variant="green"
                  className="min-h-14 w-full text-sm"
                >
                  SỬ DỤNG
                </GameButton>
                <GameButton
                  onClick={() => onSelectAmmo(ammoType)}
                  disabled={quantity <= 0 || isSelectedAmmo}
                  variant={isSelectedAmmo ? 'ghost' : 'purple'}
                  className="min-h-14 w-full text-sm"
                >
                  {isSelectedAmmo ? 'ĐANG TRANG BỊ' : 'CHỌN LÀM ĐẠN HIỆN TẠI'}
                </GameButton>
              </div>
            ) : (
              <div className="grid gap-2">
                <div className="rounded-2xl border-2 border-dashed border-cyan-100/24 bg-blue-950/54 px-3 py-2 text-center text-[11px] font-black uppercase tracking-wide text-cyan-100/68">
                  Chưa có nút trang bị / nâng cấp / tháo ra được kết nối smart contract.
                </div>
                <GameButton
                  onClick={onSell}
                  disabled={isProcessing}
                  variant="gold"
                  className="min-h-14 w-full text-sm"
                >
                  BÁN Ở CHỢ
                </GameButton>
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function extractChestRewards(txResponse: any): RewardItem[] {
  const events = Array.isArray(txResponse?.events) ? txResponse.events : [];

  return events
    .filter((event: any) => String(event?.type || '').endsWith('::player::WeaponMinted'))
    .map((event: any) => {
      const parsed = event?.parsedJson || {};
      const rarityNumber = Number(parsed.rarity || 2);
      const rarity = RARITY_MAP[rarityNumber] || RARITY_MAP[2];
      const rewardSui = Number(parsed.sui_reward || 0);

      return {
        id: parsed.weapon_id,
        name: `Vũ khí ${rarity.name}`,
        rarity: rarityNumber,
        quantity: 1,
        icon: rarity.icon,
        description: rewardSui > 0 ? `Kèm thưởng ${(rewardSui / 1_000_000_000).toLocaleString('vi-VN')} SUI` : undefined,
      };
    })
    .filter((reward: RewardItem, index: number, list: RewardItem[]) => {
      if (!reward.id) return true;
      return list.findIndex((item) => item.id === reward.id) === index;
    });
}

function RewardResultModal({
  rewards,
  onClose,
}: {
  rewards: RewardItem[];
  onClose: () => void;
}) {
  const visibleRewards = rewards.length > 0
    ? rewards
    : [{
      name: 'Đang đồng bộ phần thưởng',
      rarity: 2,
      quantity: 0,
      icon: '...',
      description: 'Giao dịch đã thành công nhưng sự kiện phần thưởng chưa trả về trong phản hồi hiện tại.',
    }];

  return (
    <motion.div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-blue-950/76 p-3 backdrop-blur-md sm:p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label="Nhận vật phẩm"
        className="relative w-full max-w-[620px] overflow-hidden rounded-[34px] border-4 border-yellow-100/75 bg-gradient-to-b from-sky-600/96 via-indigo-950/98 to-violet-950/98 p-5 text-center text-white shadow-[0_16px_0_rgba(69,26,3,0.45),0_32px_90px_rgba(15,23,42,0.7)] sm:p-7"
        initial={{ y: 36, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 24, scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-8 top-2 h-12 rounded-full bg-white/24 blur-[2px]" />
        <div className="pointer-events-none absolute -left-14 top-12 h-48 w-48 animate-glow-pulse rounded-full bg-yellow-300/24 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 bottom-10 h-52 w-52 animate-glow-pulse rounded-full bg-cyan-300/24 blur-3xl" />

        <div className="relative z-10">
          <p className="mx-auto mb-2 inline-flex rounded-full border-2 border-yellow-100/60 bg-amber-400/20 px-4 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100">
            Rương đã mở
          </p>
          <h3 className="game-title text-3xl font-black uppercase leading-none text-white sm:text-4xl">
            NHẬN VẬT PHẨM
          </h3>

          <div className={cx(
            'mt-6 grid gap-3',
            visibleRewards.length > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1',
          )}>
            {visibleRewards.map((reward, index) => {
              const rarity = RARITY_MAP[reward.rarity] || RARITY_MAP[2];

              return (
                <motion.div
                  key={reward.id || `${reward.name}-${index}`}
                  initial={{ y: 18, opacity: 0, scale: 0.92 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08 }}
                  className="relative overflow-hidden rounded-[24px] border-2 border-white/18 bg-blue-950/48 p-4 shadow-inner shadow-white/10"
                >
                  <div className={cx('absolute inset-x-4 top-4 h-20 rounded-full opacity-65 blur-2xl', rarity.bg)} />
                  <motion.div
                    animate={{ y: [0, -6, 0], scale: [1, 1.04, 1] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                    className={cx('relative mx-auto grid h-24 w-24 place-items-center rounded-[28px] border-4 bg-gradient-to-b text-xl font-black shadow-[0_10px_0_rgba(8,13,46,0.4)]', rarity.color, rarity.bg, rarity.text)}
                  >
                    {reward.icon}
                  </motion.div>
                  <div className="relative mt-3">
                    <p className={cx('text-sm font-black uppercase', rarity.text)}>{reward.name}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70">{rarity.name}</p>
                    <p className="mt-1 font-mono text-lg font-black text-white">x{reward.quantity}</p>
                    {reward.description && (
                      <p className="mt-2 text-xs font-bold text-cyan-50/78">{reward.description}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <GameButton
            onClick={onClose}
            variant="gold"
            className="mt-6 min-h-14 w-full text-sm"
          >
            XÁC NHẬN
          </GameButton>
        </div>
      </motion.section>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function Inventory({
  ammoCounts,
  selectedAmmo,
  onSelectAmmo,
  onRefreshStatus,
}: {
  ammoCounts: Record<AmmoType, number>;
  selectedAmmo: AmmoType;
  onSelectAmmo: (ammoType: AmmoType) => void;
  onRefreshStatus?: () => void;
}) {

  const account = useCurrentAccount();

  const client = useSuiClient();

  const queryClient = useQueryClient();

  const {
    mutateAsync: signAndExecuteTransaction,
  } = useSignAndExecuteTransaction();

  const [activeTab, setActiveTab] =
    useState<'chests' | 'ammo' | 'equipment'>('chests');

  const [selectedItem, setSelectedItem] =
    useState<any>(null);

  const [isOpening, setIsOpening] =
    useState(false);

  const [isProcessing] =
    useState(false);

  const [rewardResult, setRewardResult] =
    useState<RewardItem[] | null>(null);

  // ─────────────────────────────
  // QUERIES
  // ─────────────────────────────

  const { data: chestData } =
    useSuiClientQuery(
      'getOwnedObjects',

      account?.address
        ? getChestOwnedObjectsParams(
          account.address
        )
        : (undefined as any),

      {
        enabled: !!account?.address,
      }
    );

  const { data: weaponData } =
    useSuiClientQuery(
      'getOwnedObjects',

      account?.address
        ? getWeaponOwnedObjectsParams(
          account.address
        )
        : (undefined as any),

      {
        enabled: !!account?.address,
      }
    );

  const { data: keyData } =
    useSuiClientQuery(
      'getOwnedObjects',

      account?.address
        ? {
          owner: account.address,

          filter: {
            StructType:
              `${PACKAGE_ID}::player::Key`,
          },

          options: {
            showContent: true,
          },
        }
        : (undefined as any),

      {
        enabled: !!account?.address,
      }
    );

  // ─────────────────────────────
  // DATA
  // ─────────────────────────────

  const chestIds = useMemo(
    () =>
      chestData?.data
        .map((d) => d.data?.objectId)
        .filter(
          (value): value is string =>
            Boolean(value)
        ) || [],
    [chestData]
  );

  const keyIds = useMemo(
    () =>
      keyData?.data
        .map((d) => d.data?.objectId)
        .filter(
          (value): value is string =>
            Boolean(value)
        ) || [],
    [keyData]
  );

  const weapons = useMemo(
    () => weaponData?.data || [],
    [weaponData]
  );

  // ─────────────────────────────
  // OPEN CHEST
  // ─────────────────────────────

  const handleOpenChest = async (
    chestType: ChestOpenType,
    amount: number = 1
  ) => {

    if (!account?.address || isOpening) {
      return;
    }

    if (!GAME_POOL_ID) {
      toast.error(
        'Chức năng mở rương chưa được kết nối smart contract.'
      );
      return;
    }

    const selectedChestIds =
      chestIds.slice(0, amount);

    const selectedKeyIds =
      chestType === 'epic'
        ? keyIds.slice(0, amount)
        : [];

    if (selectedChestIds.length < amount) {
      toast.error(
        'Không đủ rương để mở.'
      );
      return;
    }

    if (
      chestType === 'epic' &&
      selectedKeyIds.length < amount
    ) {
      toast.error(
        'Không đủ chìa khóa.'
      );
      return;
    }

    setIsOpening(true);

    const toastId = toast.loading(
      amount > 1
        ? `Đang mở ${amount} rương...`
        : 'Đang mở rương...'
    );

    try {

      const tx =
        GameplayTx.buildOpenChestTx({
          playerAddress:
            account.address,
          poolId:
            GAME_POOL_ID,
          chestType,
          chestIds:
            selectedChestIds,
          keyIds:
            selectedKeyIds,
        });

      const result =
        await signAndExecuteTransaction({
          transaction: tx,
        });

      if (!result?.digest) {
        throw new Error(
          'Không nhận được mã giao dịch.'
        );
      }

      const txResponse = await client.waitForTransaction({
        digest:
          result.digest,
        options: {
          showEvents: true,
          showEffects: true,
          showObjectChanges: true,
        },
      });
      const rewards = extractChestRewards(txResponse);

      toast.success(
        chestType === 'epic'
          ? 'Mở rương EPIC thành công!'
          : amount > 1
            ? `Đã mở ${amount} rương!`
            : 'Mở rương thành công!',
        {
          id: toastId,
        }
      );

      await invalidateChestInventory(
        queryClient,
        account.address
      );

      scheduleChestInventoryRefetch(
        queryClient,
        account.address
      );

      await onRefreshStatus?.();
      setSelectedItem(null);
      setRewardResult(rewards);
      return;

      // ─────────────────────────────
      // DIRECT BACKEND FLOW
      // KHÔNG DÙNG PTB
      // ─────────────────────────────

      const endpoint =
        amount > 1
          ? '/api/open-chest-batch'
          : '/api/open-chest';

      const res = await fetch(
        `${API_BASE}${endpoint}`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            playerAddress:
              account!.address,

            chestType,

            amount,
          }),
        }
      );

      // FIX HTML ERROR PAGE
      const text =
        await res.text();

      let data: any;

      try {

        data =
          JSON.parse(text);

      } catch {

        console.error(
          'INVALID_JSON_RESPONSE',
          text
        );

        throw new Error(
          'Backend trả về lỗi HTML thay vì JSON'
        );
      }

      if (!data.success) {

        throw new Error(
          data.message ||
          'Mở rương thất bại'
        );
      }

      toast.success(
        amount > 1
          ? `Đã mở ${amount} rương!`
          : 'Mở rương thành công!',
        {
          id: toastId,
        }
      );

      invalidateChestInventory(
        queryClient,
        account!.address
      );

      await onRefreshStatus?.();

    } catch (err: any) {

      toast.error(
        err.message ||
        'Lỗi mở rương',
        {
          id: toastId,
        }
      );

      console.error(
        'OPEN_CHEST_ERROR',
        err
      );

    } finally {

      setIsOpening(false);
    }
  };

  // ─────────────────────────────
  // SELL ITEM
  // ─────────────────────────────

  const handleSell = async () => {

    if (
      !account ||
      !selectedItem ||
      selectedItem.type === 'chest' ||
      isProcessing
    ) {
      return;
    }

    toast.info(
      'Luồng chợ giao dịch đang hoạt động.'
    );
  };

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  return (
    <>
    <GamePanel glow="cyan" className="flex min-h-[min(720px,calc(100svh-6rem))] flex-col md:h-full md:min-h-[520px]">
      <div className="relative z-10 border-b-2 border-white/15 bg-blue-950/24 p-5">
        <PanelTitle
          eyebrow="Kho đồ"
          title="Túi đồ"
          right={
            <div className="grid grid-cols-3 gap-2 rounded-2xl border-2 border-white/15 bg-blue-950/62 p-1.5">
              <GameButton
                onClick={() => {
                  setActiveTab('chests');
                  setSelectedItem(null);
                }}
                variant={activeTab === 'chests' ? 'blue' : 'ghost'}
                className="px-4 py-2"
              >
                Rương
              </GameButton>
              <GameButton
                onClick={() => {
                  setActiveTab('ammo');
                  setSelectedItem(null);
                }}
                variant={activeTab === 'ammo' ? 'blue' : 'ghost'}
                className="px-4 py-2"
              >
                Đạn
              </GameButton>
              <GameButton
                onClick={() => {
                  setActiveTab('equipment');
                  setSelectedItem(null);
                }}
                variant={activeTab === 'equipment' ? 'purple' : 'ghost'}
                className="px-4 py-2"
              >
                Trang bị
              </GameButton>
            </div>
          }
        />
        <div className="mt-4">
          <EquipmentRail />
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3 sm:p-4">
        <div className="modal-scroll grid max-h-[52svh] min-h-[300px] auto-rows-[96px] grid-cols-3 gap-2 overflow-y-auto rounded-[24px] border-2 border-white/15 bg-blue-950/38 p-3 shadow-inner shadow-black/30 no-scrollbar sm:auto-rows-[104px] sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {activeTab === 'chests' ? (
            <>
              {chestIds.length > 0 && (
                <CompactInventorySlot
                  icon="R"
                  label="Rương"
                  count={chestIds.length}
                  rarity={3}
                  active={selectedItem?.type === 'chest'}
                  onClick={() =>
                    setSelectedItem({
                      type: 'chest',
                    })
                  }
                />
              )}

              {keyIds.length > 0 && (
                <CompactInventorySlot
                  icon="K"
                  label="Chìa khóa"
                  count={keyIds.length}
                  rarity={4}
                  active={selectedItem?.type === 'key'}
                  onClick={() =>
                    setSelectedItem({
                      type: 'key',
                    })
                  }
                />
              )}

              {Array.from({ length: Math.max(0, 6 - Number(chestIds.length > 0) - Number(keyIds.length > 0)) }).map((_, index) => (
                <EmptyInventorySlot key={`empty-chest-${index}`} />
              ))}
            </>
          ) : activeTab === 'ammo' ? (
            <>
              {(Object.keys(AMMO_ITEMS) as AmmoType[]).map((type) => {
                const item = AMMO_ITEMS[type];
                const quantity = ammoCounts[type] || 0;

                return (
                  <CompactInventorySlot
                    key={type}
                    icon={item.icon}
                    label={item.name}
                    count={quantity}
                    rarity={item.rarity}
                    active={selectedAmmo === type}
                    onClick={() =>
                      setSelectedItem({
                        type: 'ammo',
                        ammoType: type,
                        quantity,
                        data: {
                          content: {
                            fields: {
                              rarity: item.rarity,
                            },
                          },
                        },
                      })
                    }
                  />
                );
              })}
              {Array.from({ length: Math.max(0, 8 - Object.keys(AMMO_ITEMS).length) }).map((_, index) => (
                <EmptyInventorySlot key={`empty-ammo-${index}`} />
              ))}
            </>
          ) : (
            <>
              {weapons.map((w: any) => {
                const fields =
                  w.data?.content?.fields;

                const rarityStyle =
                  RARITY_MAP[fields?.rarity] ||
                  RARITY_MAP[2];

                return (
                  <CompactInventorySlot
                    key={w.data?.objectId}
                    icon={rarityStyle.icon}
                    label={rarityStyle.name}
                    level={fields?.level ?? fields?.lvl}
                    rarity={fields?.rarity}
                    active={selectedItem?.data?.objectId === w.data?.objectId}
                    onClick={() =>
                      setSelectedItem(w)
                    }
                  />
                );
              })}

              {Array.from({ length: Math.max(0, 8 - weapons.length) }).map((_, index) => (
                <EmptyInventorySlot key={`empty-gear-${index}`} />
              ))}
            </>
          )}
        </div>

        <div className="rounded-[24px] border-2 border-white/14 bg-blue-950/38 px-4 py-3 text-center shadow-inner shadow-black/25">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/72">
            Chạm vào vật phẩm để mở phiếu chi tiết
          </p>
        </div>
      </div>

      {account && (
        <div className="relative z-10 flex flex-wrap justify-between gap-2 border-t-2 border-white/10 bg-blue-950/62 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-cyan-100/55">
          <span>
            Mạng SUI: <span className="font-mono text-cyan-200">Testnet</span>
          </span>
          <span>
            Chủ sở hữu: <span className="font-mono text-white/75">{shortenId(account.address)}</span>
          </span>
        </div>
      )}
    </GamePanel>
    <AnimatePresence>
      {selectedItem && (
        <ItemTicketModal
          selectedItem={selectedItem}
          chestCount={chestIds.length}
          keyCount={keyIds.length}
          isOpening={isOpening}
          isProcessing={isProcessing}
          selectedAmmo={selectedAmmo}
          onClose={() => setSelectedItem(null)}
          onOpenChest={handleOpenChest}
          onSelectAmmo={onSelectAmmo}
          onSell={handleSell}
        />
      )}
      {rewardResult && (
        <RewardResultModal
          rewards={rewardResult}
          onClose={() => setRewardResult(null)}
        />
      )}
    </AnimatePresence>
    </>
  );
}
