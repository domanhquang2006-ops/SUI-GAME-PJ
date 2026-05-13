import {
    Transaction,
} from '@mysten/sui/transactions';

import { API_BASE } from '../config/api';

export type SponsoredTxResponse = {
    success: boolean;
    digest?: string;
    message?: string;
};

export class SuiTxService {

    // ─────────────────────────────────────────────
    // SPONSORED TX FLOW
    // SDK 2.16 COMPATIBLE
    // ─────────────────────────────────────────────
    static async executeSponsoredTransaction(params: {
        tx: Transaction;
        signTransaction: any;
    }): Promise<SponsoredTxResponse> {

        try {

            // ─────────────────────────────
            // SERIALIZE USER TX
            // KHÔNG BUILD Ở FRONTEND
            // ─────────────────────────────

            const txBytes =
                params.tx.serialize();

            // ─────────────────────────────
            // SEND TO BACKEND SPONSOR
            // ─────────────────────────────

            const sponsorRes =
                await fetch(
                    `${API_BASE}/api/sponsor-tx`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json',
                        },

                        body: JSON.stringify({
                            txBytes,
                        }),
                    }
                );

            const sponsorData =
                await sponsorRes.json();

            if (!sponsorData.success) {

                throw new Error(
                    sponsorData.message ||
                    'Sponsor failed'
                );
            }

            // ─────────────────────────────
            // USER SIGN
            // ─────────────────────────────

            const sponsoredBytes =
                Uint8Array.from(
                    sponsorData.txBytes
                );

            const signed =
                await params.signTransaction({
                    transaction:
                        sponsoredBytes,
                });

            // ─────────────────────────────
            // EXECUTE
            // ─────────────────────────────

            const executeRes =
                await fetch(
                    `${API_BASE}/api/execute-sponsored`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json',
                        },

                        body: JSON.stringify({
                            bytes:
                                signed.bytes,

                            signature:
                                signed.signature,
                        }),
                    }
                );

            const executeData =
                await executeRes.json();

            if (!executeData.success) {

                throw new Error(
                    executeData.message ||
                    'Execute failed'
                );
            }

            return {
                success: true,
                digest:
                    executeData.digest,
            };

        } catch (err: any) {

            console.error(
                '[SPONSORED_TX]',
                err
            );

            return {
                success: false,

                message:
                    err?.message ||
                    'Sponsored tx failed',
            };
        }
    }

    // ─────────────────────────────────────────────
    // NORMAL TX FLOW
    // ─────────────────────────────────────────────
    static async executeNormalTransaction(params: {
        tx: Transaction;

        signAndExecuteTransaction: any;
    }) {

        try {

            const result =
                await params
                    .signAndExecuteTransaction({
                        transaction:
                            params.tx,
                    });

            return {
                success: true,
                digest:
                    result.digest,
            };

        } catch (err: any) {

            console.error(
                '[NORMAL_TX]',
                err
            );

            return {
                success: false,

                message:
                    err?.message ||
                    'Normal tx failed',
            };
        }
    }
}
