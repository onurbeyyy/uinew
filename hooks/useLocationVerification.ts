'use client';

import { useState, useCallback } from 'react';

interface LocationResult {
  isWithinRange: boolean;
  distance: number | null;
  error: string | null;
  isLoading: boolean;
}

interface RestaurantLocation {
  latitude: number | null;
  longitude: number | null;
  requireLocationVerification: boolean;
  locationToleranceMeters: number;
}

// Haversine formülü - iki koordinat arası mesafe (metre)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Dünya yarıçapı (metre)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useLocationVerification() {
  const [result, setResult] = useState<LocationResult>({
    isWithinRange: false,
    distance: null,
    error: null,
    isLoading: false,
  });

  const verifyLocation = useCallback(
    async (restaurant: RestaurantLocation): Promise<LocationResult> => {
      // Konum doğrulama kapalıysa direkt izin ver
      if (!restaurant.requireLocationVerification) {
        const successResult = {
          isWithinRange: true,
          distance: null,
          error: null,
          isLoading: false,
        };
        setResult(successResult);
        return successResult;
      }

      // Restoran koordinatları yoksa izin ver (admin henüz eklememiş)
      if (!restaurant.latitude || !restaurant.longitude) {
        const successResult = {
          isWithinRange: true,
          distance: null,
          error: null,
          isLoading: false,
        };
        setResult(successResult);
        return successResult;
      }

      setResult((prev) => ({ ...prev, isLoading: true, error: null }));

      // Geolocation API kontrolü
      if (!navigator.geolocation) {
        const errorResult = {
          isWithinRange: false,
          distance: null,
          error: 'Tarayıcınız konum özelliğini desteklemiyor',
          isLoading: false,
        };
        setResult(errorResult);
        return errorResult;
      }

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const distance = calculateDistance(
              userLat,
              userLng,
              restaurant.latitude!,
              restaurant.longitude!
            );

            const isWithinRange = distance <= restaurant.locationToleranceMeters;

            const locationResult = {
              isWithinRange,
              distance: Math.round(distance),
              error: isWithinRange
                ? null
                : `Restorandan ${Math.round(distance)}m uzaktasınız. Sipariş vermek için restoranda olmalısınız.`,
              isLoading: false,
            };

            setResult(locationResult);
            resolve(locationResult);
          },
          (error) => {
            let errorMessage = 'Konum alınamadı';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage =
                  'Konum izni reddedildi. Sipariş vermek için konum iznine ihtiyacımız var.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Konum bilgisi alınamadı. Lütfen GPS açık olduğundan emin olun.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Konum isteği zaman aşımına uğradı. Lütfen tekrar deneyin.';
                break;
            }

            const errorResult = {
              isWithinRange: false,
              distance: null,
              error: errorMessage,
              isLoading: false,
            };
            setResult(errorResult);
            resolve(errorResult);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000, // 1 dakika cache
          }
        );
      });
    },
    []
  );

  return {
    ...result,
    verifyLocation,
  };
}
