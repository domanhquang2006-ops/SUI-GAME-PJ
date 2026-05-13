import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  useCurrentAccount,
  useSignTransaction
} from '@mysten/dapp-kit';

import { toast } from 'sonner';

import { SuiTxService } from '../services/suiTxService';
import { GameplayTx } from '../services/gameplayTx';
import { MarketTx } from '../services/marketTx';
import { GameButton, GamePanel, PanelTitle } from './ui/GamePrimitives';
import { cx } from '../utils/cx';
import { API_BASE } from '../config/api';

const RARITY_MAP: Record<number, {
  name: string,
  color: string,
  bg: string,
  text: string,
  icon: string
}> = {
  1: {
    name: 'Sứt mẻ',
    color: 'border-slate-300/70',
    bg: 'bg-slate-700/70',
    text: 'text-slate-200',
    icon: 'MẺ'
  },

  2: {
    name: 'Thường',
    color: 'border-emerald-300/80',
    bg: 'bg-emerald-700/70',
    text: 'text-emerald-100',
    icon: 'TH'
  },

  3: {
    name: 'Hiếm',
    color: 'border-sky-200/90',
    bg: 'bg-sky-700/70',
    text: 'text-sky-100',
    icon: 'HI'
  },

  4: {
    name: 'Huyền thoại',
    color: 'border-amber-200',
    bg: 'bg-amber-600/75',
    text: 'text-amber-100',
    icon: 'HT'
  },
};

function shortenId(value: string) {

  if (!value) return '';

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function Marketplace({
  onRefreshStatus
}: {
  onRefreshStatus?: () => void
}) {

  const account = useCurrentAccount();

  const {
    mutateAsync: signTransaction
  } = useSignTransaction();

  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [activeTab, setActiveTab] =
    useState<'market' | 'ammo'>('market');

  // ─────────────────────────────────────────────
  // FETCH LISTINGS
  // ─────────────────────────────────────────────

  const fetchListings = async () => {

    try {

      setIsLoading(true);

      const res = await fetch(
        `${API_BASE}/api/market/listings`
      );

      const data = await res.json();

      if (data.success) {
        setListings(data.listings);
      }

    } catch (err) {

      console.error('Lỗi tải chợ:', err);

    } finally {

      setIsLoading(false);

    }
  };

  useEffect(() => {

    fetchListings();

    const interval = setInterval(
      fetchListings,
      15000
    );

    return () => clearInterval(interval);

  }, []);

  // ─────────────────────────────────────────────
  // BUY MARKET ITEM
  // ─────────────────────────────────────────────

  const handleBuy = async (listing: any) => {

    if (!account?.address || isProcessing) return;

    setIsProcessing(true);

    const toastId =
      toast.loading('Đang xử lý mua vật phẩm...');

    try {

      const tx = MarketTx.buildBuyItemTx({
        buyerAddress: account.address,
        listingId: listing._id,
      });

      const txResult =
        await SuiTxService.executeSponsoredTransaction({
          tx,
          signTransaction,
        });

      if (!txResult.success) {
        throw new Error(
          txResult.message || 'Giao dịch tài trợ thất bại'
        );
      }

      const res = await fetch(
        `${API_BASE}/api/market/buy`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            buyerAddress: account.address,
            listingId: listing._id,
            txDigest: txResult.digest,
          })
        }
      );

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      toast.success(data.message, {
        id: toastId
      });

      onRefreshStatus?.();

      fetchListings();

    } catch (err: any) {

      toast.error(
        `Thất bại: ${err.message}`,
        { id: toastId }
      );

    } finally {

      setIsProcessing(false);

    }
  };

  // ─────────────────────────────────────────────
  // BUY AMMO
  // ─────────────────────────────────────────────

  const handleBuyAmmo = async (type: string) => {

    if (!account?.address || isProcessing) return;

    setIsProcessing(true);

    const ammoName =
      AMMO_PRODUCTS.find((item) => item.type === type)?.name || type;

    const toastId =
      toast.loading(`Đang chuẩn bị ${ammoName}...`);

    try {

      const tx = GameplayTx.buildBuyAmmoTx({
        playerAddress: account.address,
        ammoType: type,
      });

      const txResult =
        await SuiTxService.executeSponsoredTransaction({
          tx,
          signTransaction,
        });

      if (!txResult.success) {
        throw new Error(
          txResult.message || 'Giao dịch tài trợ thất bại'
        );
      }

      const res = await fetch(
        `${API_BASE}/api/buy-ammo`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            playerAddress: account.address,
            ammoType: type,
            amount: 1,
            txDigest: txResult.digest,
          })
        }
      );

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      toast.success(`Đã mua 1 ${ammoName}!`, {
        id: toastId
      });

      onRefreshStatus?.();

    } catch (err: any) {

      toast.error(
        err.message || 'Lỗi giao dịch',
        { id: toastId }
      );

    } finally {

      setIsProcessing(false);

    }
  };

  // ─────────────────────────────────────────────
  // CANCEL LISTING
  // ─────────────────────────────────────────────

  const handleCancel = async (listing: any) => {

    if (!account?.address || isProcessing) return;

    setIsProcessing(true);

    const toastId =
      toast.loading('Đang hủy bán...');

    try {

      const tx =
        MarketTx.buildCancelListingTx({
          sellerAddress: account.address,
          listingId: listing._id,
        });

      const txResult =
        await SuiTxService.executeSponsoredTransaction({
          tx,
          signTransaction,
        });

      if (!txResult.success) {
        throw new Error(
          txResult.message || 'Giao dịch tài trợ thất bại'
        );
      }

      const res = await fetch(
        `${API_BASE}/api/market/cancel`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            sellerAddress: account.address,
            listingId: listing._id,
            txDigest: txResult.digest,
          })
        }
      );

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      toast.success(data.message, {
        id: toastId
      });

      fetchListings();

    } catch (err: any) {

      toast.error(
        `Thất bại: ${err.message}`,
        { id: toastId }
      );

    } finally {

      setIsProcessing(false);

    }
  };

  // ─────────────────────────────────────────────
  // AMMO SHOP
  // ─────────────────────────────────────────────

  const AMMO_PRODUCTS = [

    {
      type: 'STONE',
      name: 'Đạn đá',
      price: 50,
      icon: 'ĐÁ',
      desc: 'Đạn nặng, sát thương mạnh.'
    },

    {
      type: 'IRON',
      name: 'Đạn sắt',
      price: 20,
      icon: 'SẮT',
      desc: 'Xuyên giáp, tăng sát thương.'
    },

    {
      type: 'FIRE',
      name: 'Đạn lửa',
      price: 50,
      icon: 'LỬA',
      desc: 'Đốt cháy và làm chậm sửa thành.'
    },

    {
      type: 'ACID',
      name: 'Đạn axít',
      price: 100,
      icon: 'AX',
      desc: 'Ăn mòn, tăng sát thương nhận vào.'
    },

    {
      type: 'CLUSTER',
      name: 'Đạn chùm',
      price: 200,
      icon: 'CH',
      desc: 'Tách thành 3 viên trên không.'
    },

    {
      type: 'VOID',
      name: 'Lõi hư không',
      price: 500,
      icon: 'HK',
      desc: 'Sát thương chuẩn, khóa hồi phục.'
    },
  ];

  return (
    <GamePanel glow="gold" className="flex h-full min-h-[520px] flex-col">
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 bg-amber-300/20 blur-[90px]" />

      <div className="relative z-10 border-b-2 border-white/15 bg-amber-950/16 p-5">
        <PanelTitle
          eyebrow="Chợ người chơi"
          title={activeTab === 'market' ? 'Chợ giao dịch' : 'Kho đạn'}
          right={
            <GameButton
              onClick={fetchListings}
              variant="ghost"
              className="px-4 py-2"
            >
              Làm mới
            </GameButton>
          }
        />

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border-2 border-white/15 bg-blue-950/60 p-1.5">
          <GameButton
              onClick={() => setActiveTab('market')}
            variant={activeTab === 'market' ? 'gold' : 'ghost'}
            className="w-full py-2"
            >
            Chợ
          </GameButton>
          <GameButton
              onClick={() => setActiveTab('ammo')}
            variant={activeTab === 'ammo' ? 'purple' : 'ghost'}
            className="w-full py-2"
            >
            Đạn
          </GameButton>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-4 no-scrollbar">
        {activeTab === 'market' ? (
          <>
            {isLoading ? (
              <div className="flex h-full items-center justify-center rounded-[26px] border-2 border-dashed border-cyan-100/25 bg-blue-950/38 text-sm font-black uppercase tracking-[0.2em] text-cyan-100/70 animate-soft-pulse">
                Đang tải vật phẩm
              </div>
            ) : listings.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-[26px] border-2 border-dashed border-cyan-100/25 bg-blue-950/38 text-center">
                <div className="mb-4 grid h-24 w-24 place-items-center rounded-[28px] border-4 border-amber-100/50 bg-linear-to-b from-amber-300 to-orange-500 text-xl font-black text-amber-950 shadow-xl">
                  CHỢ
                </div>
                <p className="game-title text-2xl font-black uppercase text-white">
                  Chợ đang trống
                </p>
                <p className="mt-2 text-sm font-bold text-cyan-100/70">
                  Chưa có vật phẩm nào được rao bán.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {listings.map(item => {
                  const rarityStyle =
                    RARITY_MAP[item.rarity] ||
                    RARITY_MAP[2];

                  const isMine =
                    account?.address === item.seller;

                  return (
                    <motion.article
                      key={item._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -6, scale: 1.02 }}
                      className="group relative flex min-h-[230px] flex-col gap-4 overflow-hidden rounded-[26px] border-2 border-white/18 bg-linear-to-b from-sky-900/70 via-blue-950/82 to-indigo-950/92 p-4 shadow-[0_10px_0_rgba(15,23,42,0.45),0_20px_42px_rgba(15,23,42,0.32)]"
                    >
                      <div className={cx('absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-35 blur-3xl', rarityStyle.bg)} />
                      <div className="absolute inset-x-4 top-2 h-8 rounded-full bg-white/14" />

                      <div className="relative z-10 flex gap-4">
                        <div className={cx('grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 bg-linear-to-b text-lg font-black shadow-inner', rarityStyle.color, rarityStyle.bg, rarityStyle.text)}>
                          {rarityStyle.icon}
                        </div>

                        <div className="min-w-0">
                          <h3 className={cx('truncate text-lg font-black uppercase tracking-tight', rarityStyle.text)}>
                            {item.itemName}
                          </h3>
                          <p className="mt-1 font-mono text-xs text-cyan-100/58">
                            ID: {shortenId(item.itemObjectId)}
                          </p>
                          <p className="mt-1 text-[10px] font-bold uppercase text-cyan-100/46">
                            Người bán: {shortenId(item.seller)}
                          </p>
                        </div>
                      </div>

                      <div className="relative z-10 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-white/15 bg-blue-950/58 p-3">
                          <p className="mb-1 text-center text-[9px] font-black uppercase tracking-wider text-cyan-100/55">
                            Sát thương
                          </p>
                          <p className="text-center font-mono text-lg font-black text-orange-200">
                            {item.damage}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/15 bg-blue-950/58 p-3">
                          <p className="mb-1 text-center text-[9px] font-black uppercase tracking-wider text-cyan-100/55">
                            Độ bền
                          </p>
                          <p className="text-center font-mono text-lg font-black text-emerald-200">
                            {item.durability}
                          </p>
                        </div>
                      </div>

                      <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-1">
                        <div className="rounded-2xl border-2 border-amber-100/30 bg-amber-500/20 px-3 py-2">
                          <span className="mr-1 text-[10px] font-black uppercase tracking-wider text-amber-100/70">Vàng</span>
                          <span className="font-mono text-xl font-black text-yellow-200">
                            {item.priceGold.toLocaleString()}
                          </span>
                        </div>

                        {isMine ? (
                          <GameButton
                            onClick={() => handleCancel(item)}
                            disabled={isProcessing}
                            variant="red"
                            className="min-w-[104px] py-2"
                          >
                            Hủy bán
                          </GameButton>
                        ) : (
                          <GameButton
                            onClick={() => handleBuy(item)}
                            disabled={isProcessing}
                            variant="gold"
                            className="min-w-[104px] py-2"
                          >
                            Mua
                          </GameButton>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {AMMO_PRODUCTS.map(item => (
              <motion.article
                key={item.type}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group relative flex min-h-[210px] flex-col gap-4 overflow-hidden rounded-[26px] border-2 border-white/18 bg-linear-to-b from-violet-800/65 via-blue-950/82 to-indigo-950/92 p-4 shadow-[0_10px_0_rgba(15,23,42,0.45),0_20px_42px_rgba(15,23,42,0.32)]"
              >
                <div className="absolute inset-x-4 top-2 h-8 rounded-full bg-white/14" />
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-fuchsia-300/25 blur-3xl" />

                <div className="relative z-10 flex gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 border-fuchsia-100/50 bg-linear-to-b from-fuchsia-300 to-indigo-600 text-lg font-black text-white shadow-inner">
                    {item.icon}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black uppercase tracking-tight text-white">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-[10px] font-bold uppercase leading-tight text-cyan-100/68">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-4">
                  <div className="rounded-2xl border-2 border-amber-100/30 bg-amber-500/20 px-3 py-2">
                    <span className="mr-1 text-[10px] font-black uppercase tracking-wider text-amber-100/70">Vàng</span>
                    <span className="font-mono text-xl font-black text-yellow-200">
                      {item.price.toLocaleString()}
                    </span>
                  </div>

                  <GameButton
                    onClick={() => handleBuyAmmo(item.type)}
                    disabled={isProcessing}
                    variant="purple"
                    className="min-w-[110px] py-2"
                  >
                    Mua 1
                  </GameButton>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </GamePanel>
  );
}
