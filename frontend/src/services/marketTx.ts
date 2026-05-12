import { Transaction } from '@mysten/sui/transactions';

export class MarketTx {

    // ─────────────────────────────────────────────
    // BUY MARKET ITEM TX
    // ─────────────────────────────────────────────
    static buildBuyItemTx(params: {
        buyerAddress: string;
        listingId: string;
    }) {

        const tx = new Transaction();

        tx.setSender(params.buyerAddress);

        // Placeholder PTB call
        tx.moveCall({
            target: `0x2::clock::timestamp_ms`,
            arguments: [
                tx.object('0x6'),
            ],
        });

        return tx;
    }

    // ─────────────────────────────────────────────
    // CANCEL LISTING TX
    // ─────────────────────────────────────────────
    static buildCancelListingTx(params: {
        sellerAddress: string;
        listingId: string;
    }) {

        const tx = new Transaction();

        tx.setSender(params.sellerAddress);

        // Placeholder PTB call
        tx.moveCall({
            target: `0x2::clock::timestamp_ms`,
            arguments: [
                tx.object('0x6'),
            ],
        });

        return tx;
    }
}