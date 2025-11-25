// Game API - Leaderboard ve oyun işlemleri
import { t, loadLocale } from './i18n';

export interface LeaderboardEntry {
  rank: number;
  playerNickname: string;
  score: number;
  playedAt: string;
  playedAtFormatted?: string;
  deviceType?: string;
  gameData?: string;
}

export interface SubmitScoreDto {
  GameType: string;
  PlayerNickname: string;
  Score: number;
  GameData?: string;
  Duration?: number;
  DeviceType?: string;
  VenueCode?: string;
  EndUserId?: number;
}

/**
 * Skor submit et (leaderboard'a kaydet)
 * Next.js API route üzerinden proxy edilir
 */
export async function submitScore(data: SubmitScoreDto): Promise<{ success: boolean; message?: string }> {
  const locale = loadLocale();

  try {
    const response = await fetch('/api/game/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': locale,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, message: result.message || t(locale, 'api.success.scoreSubmitted') };
    } else {
      console.error('❌ Skor kaydedilemedi:', result);
      return { success: false, message: result.message || t(locale, 'game.errors.scoreNotSubmitted') };
    }
  } catch (error) {
    console.error('❌ Skor submit hatası:', error);
    return { success: false, message: t(locale, 'game.messages.connectionError') };
  }
}

/**
 * Oyun için top skorları getir
 * Next.js API route üzerinden proxy edilir
 */
export async function getLeaderboard(
  gameType: string,
  count: number = 10
): Promise<LeaderboardEntry[]> {
  const locale = loadLocale();

  try {
    const response = await fetch(`/api/game/leaderboard/${gameType}/${count}`, {
      headers: {
        'Accept-Language': locale,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error('❌', t(locale, 'game.errors.leaderboardNotLoaded'));
      return [];
    }
  } catch (error) {
    console.error('❌ Leaderboard fetch hatası:', error);
    return [];
  }
}

/**
 * Oyuncu istatistiklerini getir
 * Next.js API route üzerinden proxy edilir
 */
export async function getPlayerStats(nickname: string): Promise<any> {
  const locale = loadLocale();

  try {
    const response = await fetch(`/api/game/player/${encodeURIComponent(nickname)}/stats`, {
      headers: {
        'Accept-Language': locale,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error('❌', t(locale, 'game.errors.playerStatsNotLoaded'));
      return null;
    }
  } catch (error) {
    console.error('❌ Player stats fetch hatası:', error);
    return null;
  }
}
