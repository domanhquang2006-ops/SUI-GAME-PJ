import { startTransition, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';

import { createPhaserGame } from './game/config';
import type { MatchPayload, AmmoType } from './game/createScene';
import { BattlefieldFrame } from './components/battlefield/BattlefieldFrame';
import { GameHud } from './components/hud/GameHud';
import { Inventory } from './components/Inventory';
import { Marketplace } from './components/Marketplace';
import { GameButton } from './components/ui/GamePrimitives';
import { cx } from './utils/cx';
import { verifyShot } from './verifyShot';
import { scheduleChestInventoryRefetch } from './suiChest';
import { API_BASE } from './config/api';

const ADMIN_WALLET = '0x83d77488b060f33d011dc548f358cf72938812b7609a41aa77b028a6ca88c226';

function getExplorerUrl(digest: string) {
  return `https://testnet.suivision.xyz/txblock/${digest}`;
}

// Victory modal
function VictoryModal({ digest, onContinue }: { digest: string; onContinue: () => void }) {
  return (
    <div className="pointer-events-auto w-[90%] max-w-sm animate-slide-up rounded-[30px] border-4 border-amber-100/70 bg-gradient-to-b from-sky-700/95 via-indigo-950/96 to-violet-950/96 p-7 text-center shadow-[0_14px_0_rgba(69,26,3,0.45),0_28px_70px_rgba(15,23,42,0.6)] backdrop-blur-xl">
      <div className="mx-auto mb-5 grid h-20 w-20 animate-float place-items-center rounded-[24px] border-4 border-yellow-100/75 bg-gradient-to-b from-yellow-200 to-orange-500 text-3xl font-black text-amber-950 shadow-xl shadow-amber-950/40">
        THẮNG
      </div>
      <h2 className="game-title text-3xl font-black uppercase text-white">Chiến thắng</h2>
      <p className="mt-3 text-sm font-bold text-cyan-100/90">
        Nhận thưởng: <span className="text-white">1 rương tài sản</span> và <span className="text-yellow-300">500 vàng</span>
      </p>
      <div className="mt-6 flex flex-col gap-2.5">
        <GameButton
          onClick={() => window.open(getExplorerUrl(digest), '_blank')}
          variant="ghost"
          className="w-full"
        >
          Xem giao dịch
        </GameButton>
        <GameButton
          onClick={onContinue}
          variant="green"
          className="w-full"
        >
          Tiếp tục chiến đấu
        </GameButton>
      </div>
    </div>
  );
}

type PanelName = 'inventory' | 'market';

function HudIcon({
  label,
  glyph,
  tone,
  onClick,
}: {
  label: string;
  glyph: string;
  tone: 'blue' | 'gold' | 'green' | 'purple';
  onClick: () => void;
}) {
  const toneClass = {
    blue: 'from-cyan-300 via-sky-400 to-blue-600 text-blue-950',
    gold: 'from-yellow-200 via-amber-400 to-orange-500 text-amber-950',
    green: 'from-lime-300 via-emerald-400 to-teal-500 text-emerald-950',
    purple: 'from-fuchsia-300 via-violet-400 to-indigo-600 text-indigo-950',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-[72px] flex-col items-center gap-1 rounded-2xl border-2 border-white/25 bg-blue-950/62 p-2 shadow-[0_8px_0_rgba(15,23,42,0.38),0_16px_28px_rgba(15,23,42,0.28)] backdrop-blur-xl transition hover:-translate-y-1 active:translate-y-0 sm:min-w-[82px]"
    >
      <span className={cx('grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-b text-sm font-black shadow-lg shadow-black/25 sm:h-12 sm:w-12', toneClass)}>
        {glyph}
      </span>
      <span className="text-[10px] font-black uppercase tracking-wide text-white sm:text-[11px]">
        {label}
      </span>
    </button>
  );
}

function FloatingGameHud({
  onOpenInventory,
  onOpenMarket,
  walletButton,
}: {
  onOpenInventory: () => void;
  onOpenMarket: () => void;
  walletButton: ReactNode;
}) {
  return (
    <>
      <div className="pointer-events-auto absolute left-3 top-24 z-40 flex flex-col gap-2 sm:left-4 sm:top-28 md:top-32">
        <HudIcon label="Túi đồ" glyph="TÚI" tone="blue" onClick={onOpenInventory} />
        <HudIcon label="Chợ" glyph="CHỢ" tone="gold" onClick={onOpenMarket} />
      </div>

      <div className="pointer-events-auto absolute right-3 top-24 z-40 flex flex-col gap-2 sm:right-4 sm:top-28 md:top-32">
        <HudIcon label="Nhiệm vụ" glyph="NV" tone="green" onClick={() => toast.info('Bảng nhiệm vụ sẽ được mở trong bản cập nhật tiếp theo.')} />
        <HudIcon label="Cài đặt" glyph="⚙" tone="purple" onClick={() => toast.info('Cài đặt sẽ được bổ sung sau.')} />
      </div>

      <div className="floating-wallet pointer-events-auto absolute bottom-4 right-4 z-40 rounded-2xl border-2 border-white/25 bg-blue-950/68 p-2 shadow-[0_8px_0_rgba(15,23,42,0.38)] backdrop-blur-xl">
        <p className="mb-1 text-center text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/70">Ví</p>
        {walletButton}
      </div>
    </>
  );
}

function PanelDrawer({
  activePanel,
  onClose,
  children,
}: {
  activePanel: PanelName | null;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!activePanel) return null;

  const title = activePanel === 'inventory' ? 'Túi đồ' : 'Chợ giao dịch';

  return (
    <div className="fixed inset-0 z-[70] flex justify-end overflow-y-auto bg-blue-950/55 p-0 backdrop-blur-sm md:p-4">
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section className="relative z-10 flex min-h-full w-full flex-col overflow-hidden rounded-none border-white/25 bg-blue-950/80 shadow-[0_24px_80px_rgba(15,23,42,0.6)] md:h-full md:min-h-0 md:max-w-[760px] md:rounded-[32px] md:border-2 lg:max-w-[560px] xl:max-w-[600px]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-white/15 bg-blue-950/80 px-4 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70">Bảng điều khiển</p>
            <h2 className="game-title text-2xl font-black uppercase text-white">{title}</h2>
          </div>
          <GameButton onClick={onClose} variant="red" className="px-4 py-2">
            Đóng
          </GameButton>
        </div>

        <div className="modal-scroll min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
          {children}
        </div>
      </section>
    </div>
  );
}

function RotateDeviceOverlay() {
  return (
    <div className="rotate-device-overlay fixed inset-0 z-[120] items-center justify-center overflow-hidden bg-blue-950/86 p-6 text-center text-white backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(125,211,252,0.35),transparent_28%),radial-gradient(circle_at_78%_70%,rgba(251,191,36,0.18),transparent_24%)]" />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 w-full max-w-sm rounded-[32px] border-4 border-cyan-100/35 bg-gradient-to-b from-sky-700/92 via-indigo-950/96 to-violet-950/96 p-6 shadow-[0_14px_0_rgba(15,23,42,0.45),0_28px_70px_rgba(15,23,42,0.65)]"
      >
        <div className="mx-auto mb-5 grid h-28 w-28 place-items-center">
          <div className="rotate-phone-icon relative h-20 w-12 rounded-[18px] border-4 border-cyan-100/80 bg-gradient-to-b from-cyan-300 to-blue-600 shadow-xl shadow-cyan-950/40">
            <div className="absolute inset-x-2 top-2 h-1.5 rounded-full bg-white/70" />
            <div className="absolute bottom-2 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/75" />
          </div>
        </div>
        <h2 className="game-title text-2xl font-black uppercase text-white">
          Xoay ngang thiết bị
        </h2>
        <p className="mt-3 text-sm font-bold leading-relaxed text-cyan-100/82">
          Vui lòng xoay ngang thiết bị để chơi game.
        </p>
      </motion.div>
    </div>
  );
}

// ─── APP ───────────────────────────────────────────────────────────────────────
function App() {
  const account = useCurrentAccount();
  const queryClient = useQueryClient();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [victory, setVictory] = useState<{ digest: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameSession, setGameSession] = useState(0);

  const [energy, setEnergy] = useState<number>(0);
  const [gold, setGold] = useState<number>(0);
  const [canClaim, setCanClaim] = useState<boolean>(false);
  const [regenMs, setRegenMs] = useState<number>(60_000);
  const [activePanel, setActivePanel] = useState<PanelName | null>(null);

  const [ammoCounts, setAmmoCounts] = useState<Record<AmmoType, number>>({
    WOOD: 0, STONE: 0, IRON: 0, FIRE: 0, ACID: 0, CLUSTER: 0, VOID: 0
  });
  const [selectedAmmo] = useState<AmmoType>('WOOD');

  const energyRef = useRef(energy);
  const accountAddressRef = useRef<string | null>(account?.address ?? null);
  const ammoCountsRef = useRef(ammoCounts);
  const fetchUserStatusRef = useRef<null | (() => Promise<void>)>(null);
  useEffect(() => { energyRef.current = energy; }, [energy]);
  useEffect(() => { accountAddressRef.current = account?.address ?? null; }, [account?.address]);
  useEffect(() => { ammoCountsRef.current = ammoCounts; }, [ammoCounts]);
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(
        'SYNC_AMMO_COUNTS',
        {
          detail: ammoCounts,
        }
      )
    );
  }, [ammoCounts]);

  // ─── FETCH STATUS ─────────────────────────────────────────────────────────
  const fetchUserStatus = useCallback(async () => {
    if (!account?.address) return;
    try {
      const res = await fetch(`${API_BASE}/api/user-status/${account.address}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setEnergy(data.energy);
        setGold(data.gold); // 🌟 Set Gold từ Backend
        setCanClaim(data.canClaim);
        if (data.msUntilNextRegen != null) {
          setRegenMs(data.msUntilNextRegen);
        }
        setAmmoCounts({
          WOOD: data.woodAmmo || 0,
          STONE: data.stoneAmmo || 0,
          IRON: data.ironAmmo || 0,
          FIRE: data.fireAmmo || 0,
          ACID: data.acidAmmo || 0,
          CLUSTER: data.clusterAmmo || 0,
          VOID: data.voidAmmo || 0,
        });
      }
    } catch (_) {
      // Silent fail
    }
  }, [account?.address]);

  useEffect(() => {
    fetchUserStatusRef.current = fetchUserStatus;
  }, [fetchUserStatus]);

  useEffect(() => {
    fetchUserStatus();
  }, [fetchUserStatus, gameSession]);

  // ─── REGEN COUNTDOWN ──────────────────────────────────────────────────────
  const regenSecondsDisplay = Math.ceil(regenMs / 1000);

  useEffect(() => {
    if (!account?.address || energy >= 50) return;

    const interval = setInterval(() => {
      setRegenMs((prev) => {
        if (prev <= 1000) {
          fetchUserStatus();
          return 60_000;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [account?.address, energy, fetchUserStatus]);

  // ─── BUY ENERGY (NẠP SUI) ─────────────────────────────────────────────────
  const handleBuyEnergy = async () => {
    if (!account?.address) return;

    if (energy > 40) {
      toast.error('Dự trữ năng lượng vẫn trên ngưỡng — không thể nạp thêm.');
      return;
    }

    const toastId = toast.loading('Đang khởi tạo giao dịch nạp năng lượng...');
    try {
      const txb = new Transaction();
      const [coin] = txb.splitCoins(txb.gas, [100_000_000]); // 0.1 SUI
      txb.transferObjects([coin], txb.pure.address(ADMIN_WALLET));

      const result = await signAndExecuteTransaction({ transaction: txb });

      if (!result?.digest) {
        toast.error('Không thể truy xuất mã giao dịch từ mạng SUI.', { id: toastId });
        return;
      }

      const res = await fetch(`${API_BASE}/api/buy-energy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerAddress: account.address, txDigest: result.digest }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message, { id: toastId });
        await fetchUserStatus();
      } else {
        toast.error(data.message || 'Hệ thống từ chối giao dịch.', { id: toastId });
      }
    } catch (err: any) {
      if (err?.message?.includes('rejected') || err?.message?.includes('cancel')) {
        toast.error('Giao dịch đã bị huỷ bởi người dùng.', { id: toastId });
      } else {
        console.error('[buy-energy]', err);
        toast.error('Lỗi kết nối mạng hoặc SUI SDK.', { id: toastId });
      }
    }
  };

  // ─── CLAIM DAILY ──────────────────────────────────────────────────────────
  // ─── CLAIM DAILY (NHẬN QUÀ NGÀY) ──────────────────────────────────────────
  const handleClaimDaily = async () => {
    if (!account?.address) return;
    const loadingId = toast.loading('Đang mở hộp tiếp tế hằng ngày...');
    try {
      const res = await fetch(`${API_BASE}/api/claim-daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerAddress: account.address }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message, { id: loadingId, duration: 4000 });
        await fetchUserStatus(); // Tự động cập nhật lại số Vàng và Đạn UI
      } else {
        toast.error(data.message, { id: loadingId });
      }
    } catch (_) {
      toast.error('Mất kết nối tới căn cứ.', { id: loadingId });
    }
  };

  // ─── RESET GAME ───────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    setIsSubmitting(false);
    startTransition(() => {
      setVictory(null);
      setGameSession((c) => c + 1);
    });
  }, []);

  // ─── WALL DESTROYED (replaces old TARGET HIT) ─────────────────────────────
  const handleWallDestroyedRef = useRef<((payload: MatchPayload) => Promise<void>) | null>(null);
  const handleWallDestroyed = useCallback(
    async (payload: MatchPayload) => {
      if (!account?.address || isSubmitting) return;
      setIsSubmitting(true);
      const loadingToastId = toast.loading('Đang xác thực và đúc tài sản on-chain...');

      try {
        const result = await verifyShot({ ...payload, playerAddress: account.address });

        if (result.success) {
          scheduleChestInventoryRefetch(queryClient, account.address);
          toast.success('Phá thành thành công: 1 rương tài sản và 500 vàng.', { id: loadingToastId });
          setVictory({ digest: result.digest });
        } else {
          toast.error(result.message, { id: loadingToastId });
          resetGame();
        }
      } catch (_) {
        toast.error('Máy chủ không phản hồi — vui lòng thử lại.', { id: loadingToastId });
        resetGame();
      } finally {
        setIsSubmitting(false);
        await fetchUserStatus();
      }
    },
    [account?.address, isSubmitting, queryClient, resetGame, fetchUserStatus]
  );

  useEffect(() => {
    handleWallDestroyedRef.current = handleWallDestroyed;
  }, [handleWallDestroyed]);

  // ─── KHỞI TẠO PHASER ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameContainerRef.current) return;

    const game = createPhaserGame({
      parent: gameContainerRef.current,
      onWallDestroyed: (payload) => handleWallDestroyedRef.current?.(payload),
      onShootAttempt: () => {
        if (energyRef.current <= 0) {
          toast.error('Hết năng lượng', {
            description: `Năng lượng cạn kiệt. Chờ chu kỳ tái tạo hoặc nạp 0.1 SUI.`,
            duration: 3000,
          });
          return false;
        }
        // Basic check for ammo (real sync happens in onAmmoConsumed)
        return true;
      },
      onAmmoConsumed: async (
        type: AmmoType
      ) => {

        const wallet =
          accountAddressRef.current;

        if (!wallet) {
          console.log(
            'NO WALLET'
          );
          return;
        }

        try {

          const res =
            await fetch(
              `${API_BASE}/api/use-ammo`,
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body: JSON.stringify({
                  playerAddress:
                    wallet,

                  ammoType:
                    type,
                }),
              }
            );

          const data =
            await res.json();

          console.log(
            'USE_AMMO_RESULT',
            data
          );

          if (data.success) {

            const nextEnergy =
              Math.max(
                0,
                energyRef.current - 1
              );

            energyRef.current =
              nextEnergy;

            setEnergy(
              nextEnergy
            );

            const nextAmmoCounts = {
              ...ammoCountsRef.current,

              [type]:
                Math.max(
                  0,
                  (ammoCountsRef.current[type] || 0) - 1
                ),
            };

            ammoCountsRef.current =
              nextAmmoCounts;

            setAmmoCounts(
              nextAmmoCounts
            );

            window.dispatchEvent(
              new CustomEvent(
                'SYNC_AMMO_COUNTS',
                {
                  detail:
                    nextAmmoCounts,
                }
              )
            );

            setTimeout(() => {
              void fetchUserStatusRef.current?.();
            }, 250);

            return;

            setEnergy(prev =>
              Math.max(
                0,
                prev - 1
              )
            );

            setAmmoCounts(prev => ({
              ...prev,

              [type]:
                Math.max(
                  0,
                  (prev[type] || 0) - 1
                ),
            }));
            window.dispatchEvent(
              new CustomEvent(
                'SYNC_AMMO_COUNTS',
                {
                  detail: {
                    ...ammoCounts,
                    [type]:
                      Math.max(
                        0,
                        (ammoCounts[type] || 0) - 1
                      ),
                  },
                }
              )
            );
            setTimeout(() => {
              fetchUserStatus();
            }, 250);

          } else {

            void fetchUserStatusRef.current?.();

            toast.error(
              data.message ||
              'Lỗi sử dụng đạn'
            );
          }

        } catch (err) {

          console.error(
            '[USE_AMMO]',
            err
          );
        }
      },
      onAmmoRequest: () => {
        setActivePanel('market');
        toast.info('Đã mở chợ đạn. Hãy bổ sung vũ khí!');
      },
      initialAmmoType: selectedAmmo,
      initialAmmoCounts: ammoCounts,
    });
    const syncAmmoCounts = (e: Event) => {
      game.events.emit(
        'AMMO_COUNTS_UPDATED',
        (e as CustomEvent).detail
      );
    };

    window.addEventListener(
      'SYNC_AMMO_COUNTS',
      syncAmmoCounts
    );

    return () => {
      window.removeEventListener(
        'SYNC_AMMO_COUNTS',
        syncAmmoCounts
      );

      game.destroy(true);
    };
  }, [gameSession]);

  // Render
  return (
    <>
      <Toaster position="top-center" richColors theme="dark" />
      <RotateDeviceOverlay />

      <main className="sui-artillery-shell relative flex min-h-screen w-full flex-col overflow-x-hidden overflow-y-auto bg-[#10144f] p-2 font-sans text-white sm:p-3 md:min-h-screen md:p-4 xl:h-screen xl:overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(125,211,252,0.45),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(216,180,254,0.32),transparent_22%),linear-gradient(180deg,#283a90_0%,#15175f_44%,#231052_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.48))]" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-1rem)] w-full max-w-[1920px] flex-1 flex-col gap-3 xl:min-h-0">
          <GameHud
            accountAddress={account?.address}
            gold={gold}
            energy={energy}
            canClaim={canClaim}
            regenSecondsDisplay={regenSecondsDisplay}
            onClaimDaily={handleClaimDaily}
            onBuyEnergy={handleBuyEnergy}
            connectButton={<ConnectButton connectText="Kết nối ví" />}
          />

          <BattlefieldFrame gameRef={gameContainerRef}>
            <FloatingGameHud
              onOpenInventory={() => setActivePanel('inventory')}
              onOpenMarket={() => setActivePanel('market')}
              walletButton={<ConnectButton connectText="Ví" />}
            />

            {energy <= 0 && account?.address && !victory && (
              <div
                className="absolute inset-0 z-40 cursor-not-allowed select-none"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  toast.error('Hết năng lượng', {
                    description: `Chờ ${regenSecondsDisplay}s để hồi năng lượng hoặc nạp 0.1 SUI.`,
                    duration: 3000,
                  });
                }}
              />
            )}

            {isSubmitting && (
              <div className="absolute inset-0 z-[45] flex cursor-wait items-center justify-center bg-blue-950/45 backdrop-blur-sm">
                <div className="rounded-2xl border-2 border-white/25 bg-blue-950/80 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-cyan-100 shadow-xl animate-soft-pulse">
                  Đang xử lý giao dịch
                </div>
              </div>
            )}

            {victory && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-950/45 backdrop-blur-sm">
                <VictoryModal digest={victory.digest} onContinue={resetGame} />
              </div>
            )}
          </BattlefieldFrame>
        </div>

        <PanelDrawer activePanel={activePanel} onClose={() => setActivePanel(null)}>
          {activePanel === 'inventory' ? (
            <Inventory onRefreshStatus={fetchUserStatus} />
          ) : (
            <Marketplace onRefreshStatus={fetchUserStatus} />
          )}
        </PanelDrawer>
      </main>
    </>
  );
}

export default App;
