import type { MatchPayload } from './game/createScene';

export interface VerifyShotPayload extends MatchPayload {
  playerAddress: string;
}

export type VerifyShotSuccess = {
  success: true;
  message: string;
  digest: string;
};

export type VerifyShotFailure = {
  success: false;
  message: string;
  digest?: string;
};

export type VerifyShotResponse = VerifyShotSuccess | VerifyShotFailure;

const VERIFY_SHOT_URL = 'http://localhost:3000/api/verify-shot';

export async function verifyShot(payload: VerifyShotPayload): Promise<VerifyShotResponse> {
  const response = await fetch(VERIFY_SHOT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as Partial<VerifyShotResponse>;

  if (!response.ok || !result.success) {
    return {
      success: false,
      message: result.message ?? 'Backend không chấp nhận payload.',
      digest: result.digest,
    };
  }

  if (!result.digest) {
    return {
      success: false,
      message: 'Backend trả về thành công nhưng thiếu digest giao dịch.',
    };
  }

  return {
    success: true,
    message: result.message ?? 'Mint Web3 Chest thành công.',
    digest: result.digest,
  };
}
