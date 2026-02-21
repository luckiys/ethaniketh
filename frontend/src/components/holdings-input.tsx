'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Wallet, RefreshCw, ChevronDown } from 'lucide-react';
import { useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { Holding } from '@aegisos/shared';

const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com';

// Chain IDs we fetch balances for (mainnet + testnet)
const BALANCE_CHAINS = [
  { chainId: 1, symbol: 'ETH', name: 'Ethereum' },
  { chainId: 8453, symbol: 'ETH', name: 'Base' },
  { chainId: 137, symbol: 'MATIC', name: 'Polygon' },
  { chainId: 42161, symbol: 'ETH', name: 'Arbitrum' },
  { chainId: 10, symbol: 'ETH', name: 'Optimism' },
  { chainId: 11155111, symbol: 'ETH', name: 'Sepolia' },
  { chainId: 84532, symbol: 'ETH', name: 'Base Sepolia' },
  { chainId: 421614, symbol: 'ETH', name: 'Arbitrum Sepolia' },
  { chainId: 11155420, symbol: 'ETH', name: 'OP Sepolia' },
  { chainId: 80002, symbol: 'POL', name: 'Polygon Amoy' },
  { chainId: 296, symbol: 'HBAR', name: 'Hedera Testnet' },
];

const CRYPTO_LIST = [
  { symbol: 'BTC',  name: 'Bitcoin' },
  { symbol: 'ETH',  name: 'Ethereum' },
  { symbol: 'SOL',  name: 'Solana' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'BNB',  name: 'BNB' },
  { symbol: 'XRP',  name: 'XRP' },
  { symbol: 'ADA',  name: 'Cardano' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'TON',  name: 'Toncoin' },
  { symbol: 'SHIB', name: 'Shiba Inu' },
  { symbol: 'DOT',  name: 'Polkadot' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'POL', name: 'Polygon (POL)' },
  { symbol: 'LINK', name: 'Chainlink' },
  { symbol: 'UNI',  name: 'Uniswap' },
  { symbol: 'NEAR', name: 'NEAR Protocol' },
  { symbol: 'ATOM', name: 'Cosmos' },
  { symbol: 'LTC',  name: 'Litecoin' },
  { symbol: 'ARB',  name: 'Arbitrum' },
  { symbol: 'OP',   name: 'Optimism' },
  { symbol: 'HBAR', name: 'Hedera' },
  { symbol: 'SUI',  name: 'Sui' },
  { symbol: 'APT',  name: 'Aptos' },
  { symbol: 'TRX',  name: 'TRON' },
  { symbol: 'FIL',  name: 'Filecoin' },
  { symbol: 'ICP',  name: 'Internet Computer' },
  { symbol: 'AAVE', name: 'Aave' },
  { symbol: 'BCH',  name: 'Bitcoin Cash' },
  { symbol: 'PEPE', name: 'Pepe' },
];

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1)    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

interface CryptoSelectProps {
  value: string;
  onChange: (symbol: string) => void;
  onPriceKnown?: (symbol: string, price: number) => void;
  disabled?: boolean;
  prices: Record<string, number>;
  walletSymbols?: string[];
}

function CryptoSelect({ value, onChange, onPriceKnown, disabled, prices, walletSymbols = [] }: CryptoSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [dropdownPrices, setDropdownPrices] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => { setDropdownPrices(prev => ({ ...prev, ...prices })); }, [prices]);

  const fullList = useMemo(() => {
    const seen = new Set(CRYPTO_LIST.map((c) => c.symbol));
    const extra = walletSymbols.filter((s) => s && !seen.has(s)).map((symbol) => ({ symbol, name: symbol }));
    return [...CRYPTO_LIST, ...extra];
  }, [walletSymbols]);

  const filtered = fullList.filter(
    (c) =>
      c.symbol.toLowerCase().includes(query.toLowerCase()) ||
      c.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 14);

  // Fetch prices for visible dropdown items (debounced 100ms)
  useEffect(() => {
    if (!open || filtered.length === 0) return;
    if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
    fetchTimeout.current = setTimeout(() => {
      const syms = filtered.map((c) => c.symbol).join(',');
      fetch(`/api/prices?symbols=${syms}`)
        .then((r) => r.json())
        .then(({ prices: p }: { prices: Record<string, number> }) => {
          if (Object.keys(p).length > 0) setDropdownPrices((prev) => ({ ...prev, ...p }));
        })
        .catch(() => {});
    }, 100);
    return () => { if (fetchTimeout.current) clearTimeout(fetchTimeout.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const select = (symbol: string) => {
    const price = dropdownPrices[symbol] ?? prices[symbol];
    if (price != null && onPriceKnown) onPriceKnown(symbol, price);
    onChange(symbol);
    setQuery(symbol);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative min-w-[200px]">
      <div className="flex items-center rounded border border-zinc-700 bg-zinc-900 focus-within:border-zinc-600">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search coin..."
          disabled={disabled}
          className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-zinc-100 placeholder-zinc-500 text-xs outline-none"
        />
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 mr-1.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[340px] max-w-md rounded-md border border-zinc-700 bg-zinc-900 shadow-xl max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">No results</p>
          ) : (
            filtered.map((c) => {
              const livePrice = dropdownPrices[c.symbol];
              return (
                <button
                  key={c.symbol}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(c.symbol)}
                  className="w-full flex items-center gap-4 px-4 py-2.5 text-left text-sm hover:bg-zinc-800 transition-colors"
                >
                  <span className="font-semibold text-zinc-200 w-14 shrink-0">{c.symbol}</span>
                  <span className="text-zinc-500 flex-1 truncate">{c.name}</span>
                  {livePrice != null ? (
                    <span className="text-emerald-400 shrink-0 font-mono text-sm min-w-[80px] text-right">${formatPrice(livePrice)}</span>
                  ) : (
                    <span className="text-zinc-600 shrink-0 text-xs">...</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

interface HoldingsInputProps {
  holdings: Holding[];
  onChange: (holdings: Holding[]) => void;
  disabled?: boolean;
  walletAddress?: `0x${string}` | undefined;
}

export function HoldingsInput({ holdings, onChange, disabled, walletAddress }: HoldingsInputProps) {
  const [importing, setImporting] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const lastSymbolKey = useRef<string>('');
  const autoImportedFor = useRef<string | null>(null);
  const [walletChecked, setWalletChecked] = useState(false);
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [solanaLoading, setSolanaLoading] = useState(false);
  const [erc20Tokens, setErc20Tokens] = useState<Array<{ symbol: string; amount: number; decimals: number }>>([]);
  const [erc20Loading, setErc20Loading] = useState(false);
  const [solanaSplTokens, setSolanaSplTokens] = useState<Array<{ symbol: string; amount: number }>>([]);
  const [solanaSplLoading, setSolanaSplLoading] = useState(false);
  const holdingsRef = useRef(holdings);
  const onChangeRef = useRef(onChange);
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Fetch all ERC-20 token balances (Blockscout, no API key)
  useEffect(() => {
    if (!walletAddress) {
      setErc20Tokens([]);
      return;
    }
    setErc20Loading(true);
    const chainIds = BALANCE_CHAINS.map((c) => c.chainId).filter((id) => [1, 11155111, 8453, 84532, 137, 42161, 421614, 10, 11155420].includes(id));
    fetch(`/api/token-balances?address=${walletAddress}&chainIds=${chainIds.join(',')}`)
      .then((r) => r.json())
      .then(({ tokens }: { tokens: Array<{ symbol: string; amount: number; decimals: number }> }) => {
        setErc20Tokens(tokens ?? []);
      })
      .catch(() => setErc20Tokens([]))
      .finally(() => setErc20Loading(false));
  }, [walletAddress]);

  // Fetch Solana Devnet balance when Phantom is available
  useEffect(() => {
    if (!walletAddress || typeof window === 'undefined') {
      setSolanaBalance(null);
      setSolanaSplTokens([]);
      setSolanaSplLoading(false);
      return;
    }
    const phantom = (window as unknown as { phantom?: { solana?: { connect(): Promise<{ publicKey: { toBase58(): string } }>; isConnected?: boolean; publicKey?: { toBase58(): string } } } }).phantom?.solana;
    if (!phantom) {
      setSolanaBalance(null);
      setSolanaSplTokens([]);
      setSolanaSplLoading(false);
      return;
    }
    setSolanaLoading(true);
    const run = async () => {
      try {
        let pubkey = phantom.publicKey;
        if (!pubkey || !phantom.isConnected) {
          const res = await phantom.connect();
          pubkey = res.publicKey;
        }
        if (!pubkey) {
          setSolanaBalance(0);
          return;
        }
        const conn = new Connection(SOLANA_DEVNET_RPC);
        const lamports = await conn.getBalance(new PublicKey(pubkey.toBase58()));
        setSolanaBalance(lamports / LAMPORTS_PER_SOL);
        // Fetch SPL token balances
        setSolanaSplLoading(true);
        fetch(`/api/solana-token-balances?pubkey=${encodeURIComponent(pubkey.toBase58())}`)
          .then((r) => r.json())
          .then(({ tokens }: { tokens: Array<{ symbol: string; amount: number }> }) => {
            setSolanaSplTokens(tokens ?? []);
          })
          .catch(() => setSolanaSplTokens([]))
          .finally(() => setSolanaSplLoading(false));
      } catch {
        setSolanaBalance(null);
        setSolanaSplTokens([]);
      } finally {
        setSolanaLoading(false);
      }
    };
    run();
  }, [walletAddress]);

  // Fetch native token balance from all supported chains (mainnet + testnet)
  const b1 = useBalance({ address: walletAddress, chainId: 1 });
  const b2 = useBalance({ address: walletAddress, chainId: 8453 });
  const b3 = useBalance({ address: walletAddress, chainId: 137 });
  const b4 = useBalance({ address: walletAddress, chainId: 42161 });
  const b5 = useBalance({ address: walletAddress, chainId: 10 });
  const b6 = useBalance({ address: walletAddress, chainId: 11155111 });
  const b7 = useBalance({ address: walletAddress, chainId: 84532 });
  const b8 = useBalance({ address: walletAddress, chainId: 421614 });
  const b9 = useBalance({ address: walletAddress, chainId: 11155420 });
  const b10 = useBalance({ address: walletAddress, chainId: 80002 });
  const b11 = useBalance({ address: walletAddress, chainId: 296 });

  const balances = useMemo(
    () => [b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11],
    [b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11]
  );

  // Aggregate by symbol: { ETH: totalAmount, MATIC: totalAmount, SOL: ... }
  const aggregatedBySymbol = useMemo(() => {
    const map: Record<string, { amount: number; decimals: number; symbol: string }> = {};
    balances.forEach(({ data }, i) => {
      const chain = BALANCE_CHAINS[i];
      if (!data || !chain) return;
      const amount = parseFloat(formatUnits(data.value, data.decimals));
      if (amount <= 0) return;
      const sym = chain.symbol;
      if (!map[sym]) map[sym] = { amount: 0, decimals: data.decimals, symbol: data.symbol ?? sym };
      map[sym].amount += amount;
    });
    // Include Solana Devnet SOL
    if (solanaBalance != null && solanaBalance > 0) {
      const sym = 'SOL';
      if (!map[sym]) map[sym] = { amount: 0, decimals: 9, symbol: sym };
      map[sym].amount += solanaBalance;
    }
    // Include ERC-20 tokens (aggregate by symbol)
    for (const t of erc20Tokens) {
      const sym = t.symbol?.toUpperCase();
      if (!sym) continue;
      if (!map[sym]) map[sym] = { amount: 0, decimals: t.decimals, symbol: sym };
      map[sym].amount += t.amount;
    }
    // Include Solana SPL tokens
    for (const t of solanaSplTokens) {
      const sym = t.symbol?.toUpperCase();
      if (!sym) continue;
      if (!map[sym]) map[sym] = { amount: 0, decimals: 9, symbol: sym };
      map[sym].amount += t.amount;
    }
    return map;
  }, [balances, solanaBalance, erc20Tokens, solanaSplTokens]);

  const hasAnyBalance = Object.values(aggregatedBySymbol).some((v) => v.amount > 0);
  const allBalancesLoaded =
    balances.every((b) => !b.isFetching) && !solanaLoading && !erc20Loading && !solanaSplLoading;

  const applyPrices = useCallback(
    (p: Record<string, number>) => {
      setPrices((prev) => ({ ...prev, ...p }));
      if (disabled) return;
      const current = holdingsRef.current;
      const updated = current.map((h) => {
        const sym = h.symbol?.toUpperCase();
        const livePrice = sym ? p[sym] : undefined;
        if (livePrice != null && h.amount > 0) return { ...h, valueUsd: h.amount * livePrice };
        return h;
      });
      const changed = updated.some((h, i) => h.valueUsd !== current[i].valueUsd);
      if (changed) onChangeRef.current(updated);
    },
    [disabled]
  );

  const fetchPrices = useCallback(
    (syms: string[]) => {
      if (syms.length === 0) return;
      fetch(`/api/prices?symbols=${syms.join(',')}`)
        .then((r) => r.json())
        .then(({ prices: p }: { prices: Record<string, number> }) => {
          if (Object.keys(p).length > 0) applyPrices(p);
        })
        .catch(() => {});
    },
    [applyPrices]
  );

  // Fetch when the symbol set changes
  useEffect(() => {
    const symbols = [...new Set(holdings.map((h) => h.symbol?.toUpperCase()).filter(Boolean))] as string[];
    const key = [...symbols].sort().join(',');
    if (!key || key === lastSymbolKey.current) return;
    lastSymbolKey.current = key;
    fetchPrices(symbols);
  }, [holdings, fetchPrices]);

  // Poll every 30s to keep prices live
  useEffect(() => {
    const id = setInterval(() => {
      const current = holdingsRef.current;
      const symbols = [...new Set(current.map((h) => h.symbol?.toUpperCase()).filter(Boolean))] as string[];
      if (symbols.length > 0) fetchPrices(symbols);
    }, 30_000);
    return () => clearInterval(id);
  }, [fetchPrices]);

  // Auto-import balances when wallet first connects (native + ERC-20 + Solana tokens)
  useEffect(() => {
    if (!walletAddress || disabled) return;
    if (autoImportedFor.current === walletAddress) return;
    if (!allBalancesLoaded) return;
    autoImportedFor.current = walletAddress;
    setWalletChecked(true);
    if (!hasAnyBalance) return;
    const isEmpty = !holdings.some((h) => h.symbol?.trim() && (h.amount > 0 || (h.valueUsd ?? 0) > 0));
    if (!isEmpty) return;
    setImporting(true);
    const symbols = Object.keys(aggregatedBySymbol);
    fetch(`/api/prices?symbols=${symbols.join(',')}`)
      .then((r) => r.json())
      .then(({ prices: p }: { prices: Record<string, number> }) => {
        const newHoldings: Holding[] = [];
        for (const [sym, { amount }] of Object.entries(aggregatedBySymbol)) {
          const price = p[sym?.toUpperCase() ?? ''];
          const valueUsd = price && price > 0 ? amount * price : 0;
          if (price && price > 0) setPrices((prev) => ({ ...prev, [sym.toUpperCase()]: price }));
          newHoldings.push({ symbol: sym, amount, valueUsd });
        }
        onChange(newHoldings);
      })
      .catch(() => {
        const newHoldings: Holding[] = Object.entries(aggregatedBySymbol).map(([sym, { amount }]) => ({
          symbol: sym,
          amount,
          valueUsd: 0,
        }));
        onChange(newHoldings);
      })
      .finally(() => setImporting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, allBalancesLoaded, hasAnyBalance, disabled]);

  useEffect(() => {
    if (!walletAddress) { setWalletChecked(false); autoImportedFor.current = null; }
  }, [walletAddress]);

  const importFromWallet = async () => {
    if (!walletAddress || !hasAnyBalance) return;
    setImporting(true);
    try {
      const symbols = Object.keys(aggregatedBySymbol);
      const res = await fetch(`/api/prices?symbols=${symbols.join(',')}`);
      const { prices: p } = (await res.json()) as { prices: Record<string, number> };
      const newHoldings: Holding[] = [];
      for (const [sym, { amount }] of Object.entries(aggregatedBySymbol)) {
        const price = p[sym?.toUpperCase() ?? ''];
        const valueUsd = price && price > 0 ? amount * price : 0;
        if (price && price > 0) setPrices((prev) => ({ ...prev, [sym.toUpperCase()]: price }));
        newHoldings.push({ symbol: sym, amount, valueUsd });
      }
      onChange(newHoldings);
    } catch {
      const newHoldings: Holding[] = Object.entries(aggregatedBySymbol).map(([sym, { amount }]) => ({
        symbol: sym,
        amount,
        valueUsd: 0,
      }));
      onChange(newHoldings);
    } finally {
      setImporting(false);
    }
  };

  const addRow = () => onChange([...holdings, { symbol: '', amount: 0, valueUsd: 0 }]);

  const updateSymbol = (i: number, symbol: string, knownPrice?: number) => {
    const next = [...holdings];
    if (!next[i]) return;
    const row = next[i];
    next[i] = { ...row, symbol };
    if (knownPrice != null) {
      setPrices((prev) => ({ ...prev, [symbol.toUpperCase()]: knownPrice }));
      if (row.amount > 0) {
        next[i] = { ...next[i], valueUsd: row.amount * knownPrice };
      }
    } else {
      // Fetch price immediately when selecting a coin (dropdown may not have loaded yet)
      fetchPrices([symbol.toUpperCase()]);
    }
    lastSymbolKey.current = '';
    onChange(next);
  };

  const updateRow = (i: number, field: 'amount' | 'valueUsd', value: string | number) => {
    const next = [...holdings];
    const row = next[i];
    if (!row) return;
    if (field === 'amount') {
      const amount = Number(value) || 0;
      const livePrice = row.symbol ? prices[row.symbol.toUpperCase()] : undefined;
      next[i] = livePrice != null ? { ...row, amount, valueUsd: amount * livePrice } : { ...row, amount };
    } else {
      next[i] = { ...row, valueUsd: Number(value) || 0 };
    }
    onChange(next);
  };

  const removeRow = (i: number) => onChange(holdings.filter((_, j) => j !== i));

  const canImport = walletAddress && hasAnyBalance && !disabled;
  const walletHasNoHoldings =
    walletAddress && walletChecked && allBalancesLoaded && !hasAnyBalance && holdings.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-400">
          Holdings
          {Object.keys(prices).length > 0 && (
            <span className="ml-2 text-emerald-500 text-xs font-normal">· live</span>
          )}
        </label>
        <div className="flex items-center gap-2">
          {canImport && (
            <button type="button" onClick={importFromWallet} disabled={importing}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${importing ? 'animate-spin' : ''}`} />
              {importing ? 'Importing...' : 'Refresh from wallet'}
            </button>
          )}
          {walletAddress && !canImport && !walletHasNoHoldings && allBalancesLoaded && (
            <button type="button" onClick={importFromWallet} disabled={importing}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors">
              <Wallet className="h-4 w-4" />
              {importing ? 'Importing...' : 'Import from wallet'}
            </button>
          )}
          <button type="button" onClick={addRow} disabled={disabled}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors">
            <Plus className="h-4 w-4" />
            Add row
          </button>
        </div>
      </div>

      {walletAddress && !allBalancesLoaded ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-6 text-center">
          <RefreshCw className="h-8 w-8 text-zinc-500 mx-auto mb-2 animate-spin" />
          <p className="text-sm font-medium text-zinc-400">Checking balances across chains…</p>
          <p className="text-xs text-zinc-600 mt-1">Native + ERC-20 tokens + Solana SPL across all chains</p>
        </div>
      ) : walletHasNoHoldings ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-6 text-center">
          <Wallet className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-400">No native balance found</p>
          <p className="text-xs text-zinc-600 mt-1">No ETH, MATIC, POL, HBAR, etc. on supported chains. Add holdings manually.</p>
          <button type="button" onClick={addRow} disabled={disabled}
            className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors mx-auto">
            <Plus className="h-4 w-4" />
            Add manually
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 overflow-visible w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs min-w-[220px]">Coin</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs min-w-[160px]">Value (USD)</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => {
                const sym = h.symbol?.toUpperCase();
                const livePrice = sym ? prices[sym] : undefined;
                return (
                  <tr key={i} className="border-t border-zinc-800">
                    <td className="px-4 py-2.5 overflow-visible align-top">
                      <CryptoSelect value={h.symbol} onChange={(s) => updateSymbol(i, s)} onPriceKnown={(sym, p) => updateSymbol(i, sym, p)} disabled={disabled} prices={prices} walletSymbols={Object.keys(aggregatedBySymbol)} />
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <input type="number" value={h.amount || ''} onChange={(e) => updateRow(i, 'amount', e.target.value)}
                        placeholder="0" disabled={disabled}
                        className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 text-sm outline-none focus:border-zinc-600" />
                    </td>
                    <td className="px-4 py-2.5 align-top min-w-[140px]">
                      <input type="number" value={h.valueUsd ?? ''}
                        onChange={(e) => updateRow(i, 'valueUsd', e.target.value)}
                        placeholder={livePrice != null && h.amount > 0 ? String(h.amount * livePrice) : '0'}
                        disabled={disabled}
                        className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 text-sm font-mono outline-none focus:border-zinc-600" />
                    </td>
                    <td className="px-2 py-1.5">
                      <button type="button" onClick={() => removeRow(i)} disabled={disabled}
                        className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 disabled:opacity-50 transition-colors">
                        x
                      </button>
                    </td>
                  </tr>
                );
              })}
              {holdings.length === 0 && !walletHasNoHoldings && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-xs text-zinc-500">
                    {walletAddress ? 'Import from wallet or add a holding manually.' : 'Add at least one holding to start.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
