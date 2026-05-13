import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cx } from '../../utils/cx';

const buttonVariants = {
  gold: 'from-amber-300 via-yellow-400 to-orange-500 text-amber-950 border-amber-100/80 shadow-amber-900/35',
  blue: 'from-sky-300 via-cyan-400 to-blue-500 text-blue-950 border-sky-100/80 shadow-blue-900/35',
  green: 'from-lime-300 via-emerald-400 to-teal-500 text-emerald-950 border-lime-100/80 shadow-emerald-900/35',
  red: 'from-rose-300 via-red-400 to-orange-500 text-red-950 border-red-100/80 shadow-red-900/35',
  purple: 'from-fuchsia-300 via-violet-400 to-indigo-500 text-indigo-950 border-fuchsia-100/80 shadow-indigo-900/35',
  ghost: 'from-white/10 via-white/5 to-sky-950/30 text-sky-50 border-white/20 shadow-blue-950/20',
};

export type GameButtonVariant = keyof typeof buttonVariants;

export function GameButton({
  children,
  className,
  variant = 'gold',
  disabled,
  ...props
}: HTMLMotionProps<'button'> & {
  variant?: GameButtonVariant;
}) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -2, scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      disabled={disabled}
      className={cx(
        'relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 bg-linear-to-b px-4 py-3 text-xs font-black uppercase tracking-wide',
        'shadow-[0_8px_0_rgba(0,0,0,0.22),0_18px_36px_var(--tw-shadow-color)] transition-[filter,opacity,transform] duration-200',
        'before:absolute before:inset-x-2 before:top-1 before:h-1/3 before:rounded-full before:bg-white/35 before:content-[""]',
        'after:absolute after:inset-0 after:-z-10 after:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.45),transparent_42%)] after:content-[""]',
        disabled && 'cursor-not-allowed opacity-45 grayscale',
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function GamePanel({
  children,
  className,
  glow = 'cyan',
}: {
  children: ReactNode;
  className?: string;
  glow?: 'cyan' | 'gold' | 'violet';
}) {
  const glowClass =
    glow === 'gold'
      ? 'shadow-amber-900/35'
      : glow === 'violet'
        ? 'shadow-violet-950/40'
        : 'shadow-sky-950/40';

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cx(
        'game-panel relative overflow-hidden rounded-[28px] border-2 border-white/25 bg-linear-to-b from-sky-200/20 via-indigo-950/84 to-blue-950/92',
        'shadow-[0_18px_0_rgba(32,20,92,0.45),0_26px_60px_var(--tw-shadow-color)]',
        glowClass,
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-5 top-3 h-8 rounded-full bg-white/18 blur-[1px]" />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/18" />
      {children}
    </motion.section>
  );
}

export function PanelTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/80">
            {eyebrow}
          </p>
        )}
        <h2 className="game-title text-2xl font-black uppercase leading-none text-white sm:text-3xl">
          {title}
        </h2>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...props
}: HTMLMotionProps<'button'> & {
  label: string;
}) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      whileHover={{ y: -2, scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className={cx(
        'grid h-11 w-11 place-items-center rounded-2xl border-2 border-white/25 bg-linear-to-b from-white/25 to-sky-950/50 text-sm font-black text-white shadow-[0_6px_0_rgba(0,0,0,0.22)]',
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function ResourcePill({
  label,
  value,
  icon,
  tone = 'gold',
  sublabel,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: 'gold' | 'blue' | 'green';
  sublabel?: string;
}) {
  const toneClass =
    tone === 'blue'
      ? 'from-cyan-300 to-blue-500 text-cyan-950 shadow-cyan-950/35'
      : tone === 'green'
        ? 'from-lime-300 to-emerald-500 text-emerald-950 shadow-emerald-950/35'
        : 'from-yellow-300 to-orange-500 text-amber-950 shadow-amber-950/35';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex min-w-0 items-center gap-2 rounded-2xl border-2 border-white/25 bg-blue-950/52 p-2 pr-3 shadow-inner shadow-white/10 sm:gap-3 sm:pr-4"
    >
      <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-b text-sm font-black shadow-lg', toneClass)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-100/70">{label}</p>
        <div className="font-mono text-lg font-black leading-none text-white">{value}</div>
        {sublabel && <p className="mt-0.5 text-[9px] font-bold text-cyan-200/80">{sublabel}</p>}
      </div>
    </motion.div>
  );
}

export function EnergyMeter({
  value,
  max = 50,
  regenLabel,
}: {
  value: number;
  max?: number;
  regenLabel?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="min-w-[150px] rounded-2xl border-2 border-white/20 bg-blue-950/58 p-2.5 shadow-inner shadow-black/35 sm:min-w-[180px]">
      <div className="mb-1 flex items-end justify-between">
        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/75">Năng lượng</span>
        <span className="font-mono text-sm font-black text-white">{value}/{max}</span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-full border border-sky-100/40 bg-blue-950">
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 110, damping: 18 }}
          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-cyan-300 via-sky-300 to-violet-300"
        />
        <div className="absolute inset-0 animate-energy-sheen bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.42)_42%,transparent_70%)]" />
      </div>
      {regenLabel && <p className="mt-1 text-[10px] font-bold text-cyan-100/80">{regenLabel}</p>}
    </div>
  );
}
