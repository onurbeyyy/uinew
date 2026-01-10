'use client';

import { useEffect, useState } from 'react';
import { useMenu } from '@/contexts/MenuContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTitle } from '@/utils/language';
import { saveCart, loadCart } from '@/utils/cartUtils';
import { useToast } from '@/components/ui/Toast';
import type { FeatureGroup, Feature, CartItemFeature, Product } from '@/types/api';

interface FeatureSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  portion?: { id: number; name: string; price: number; sambaPortionId?: number } | null;
  quantity: number;
  onAddToCart?: () => void;
}

export default function FeatureSelectionModal({
  isOpen,
  onClose,
  product,
  portion,
  quantity,
  onAddToCart,
}: FeatureSelectionModalProps) {
  const { customerData, customerCode, cartKey, isTableMode } = useMenu();
  const { language, t } = useLanguage();
  const { showCartToast } = useToast();

  const [featureGroups, setFeatureGroups] = useState<FeatureGroup[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Map<number, Feature[]>>(new Map());
  const [noOptionSelected, setNoOptionSelected] = useState<Set<number>>(new Set()); // "istemiyorum" seçili gruplar
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ürün özellikleri API'den çek
  useEffect(() => {
    if (isOpen && product && customerData?.customer?.id) {
      fetchProductFeatures();
    }
  }, [isOpen, product, customerData?.customer?.id]);

  const fetchProductFeatures = async () => {
    if (!product || !customerData?.customer?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const productId = product.id ?? product.Id;
      const customerId = customerData.customer.id;

      const response = await fetch(
        `https://apicanlimenu.online/api/menu/product-features?customerId=${customerId}&productId=${productId}`
      );

      const data = await response.json();

      if (data.success && data.features) {
        setFeatureGroups(data.features);
        // Seçimleri sıfırla
        setSelectedFeatures(new Map());
        setNoOptionSelected(new Set());
      } else {
        // Özellik yoksa doğrudan sepete ekle
        if (data.features?.length === 0) {
          handleDirectAddToCart();
        }
      }
    } catch (err) {
      console.error('Feature fetch error:', err);
      setError('Özellikler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // "İstemiyorum" seçimi
  const toggleNoOption = (groupId: number) => {
    setNoOptionSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
        // İstemiyorum seçildiğinde diğer seçimleri temizle
        setSelectedFeatures((prevFeatures) => {
          const newMap = new Map(prevFeatures);
          newMap.delete(groupId);
          return newMap;
        });
      }
      return newSet;
    });
  };

  // Özellik seçimi
  const toggleFeature = (group: FeatureGroup, feature: Feature) => {
    // Özellik seçildiğinde "istemiyorum"u kaldır
    setNoOptionSelected((prev) => {
      const newSet = new Set(prev);
      newSet.delete(group.id);
      return newSet;
    });

    setSelectedFeatures((prev) => {
      const newMap = new Map(prev);
      const currentSelection = newMap.get(group.id) || [];

      const isSelected = currentSelection.some((f) => f.id === feature.id);

      if (isSelected) {
        // Kaldır
        newMap.set(
          group.id,
          currentSelection.filter((f) => f.id !== feature.id)
        );
      } else {
        // Ekle (max kontrolü)
        if (group.maxSelection > 0 && currentSelection.length >= group.maxSelection) {
          // Max'a ulaşıldıysa en eski seçimi kaldır
          const newSelection = [...currentSelection.slice(1), feature];
          newMap.set(group.id, newSelection);
        } else {
          newMap.set(group.id, [...currentSelection, feature]);
        }
      }

      return newMap;
    });
  };

  // Seçim geçerli mi kontrol et
  const isSelectionValid = (): boolean => {
    for (const group of featureGroups) {
      const selected = selectedFeatures.get(group.id) || [];
      const hasNoOption = noOptionSelected.has(group.id);

      // "İstemiyorum" seçili ise bu grup için geçerli
      if (hasNoOption) continue;

      if (group.isRequired && selected.length === 0) {
        return false;
      }

      if (group.minSelection > 0 && selected.length < group.minSelection) {
        return false;
      }
    }
    return true;
  };

  // Hata mesajları
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];

    for (const group of featureGroups) {
      const selected = selectedFeatures.get(group.id) || [];
      const hasNoOption = noOptionSelected.has(group.id);

      // "İstemiyorum" seçili ise hata yok
      if (hasNoOption) continue;

      if (group.isRequired && selected.length === 0) {
        errors.push(`"${group.name}" için seçim yapmalısınız`);
      } else if (group.minSelection > 0 && selected.length < group.minSelection) {
        errors.push(`"${group.name}" için en az ${group.minSelection} seçim yapmalısınız`);
      }
    }

    return errors;
  };

  // Toplam fiyat hesapla
  const calculateTotalPrice = (): number => {
    const basePrice = portion?.price ?? product?.Price ?? product?.price ?? 0;
    let featuresPrice = 0;

    selectedFeatures.forEach((features) => {
      features.forEach((f) => {
        featuresPrice += f.price;
      });
    });

    return (basePrice + featuresPrice) * quantity;
  };

  // Özellik fiyatları toplamı
  const calculateFeaturesPrice = (): number => {
    let total = 0;
    selectedFeatures.forEach((features) => {
      features.forEach((f) => {
        total += f.price;
      });
    });
    return total;
  };

  // Sepete ekle
  const handleAddToCart = () => {
    if (!product || !isTableMode || !cartKey || !customerCode) return;

    if (!isSelectionValid()) {
      return;
    }

    const cartItems = loadCart(cartKey, customerCode);

    const productId = portion?.id ?? product.Id ?? product.id;
    const portionName = portion?.name || '';
    const productName = getTitle(product, language);
    const displayName = portionName ? `${productName} (${portionName})` : productName;

    // Seçilen özellikleri düzleştir
    const features: CartItemFeature[] = [];
    selectedFeatures.forEach((featureList, groupId) => {
      featureList.forEach((f) => {
        features.push({
          featureId: f.id,
          featureGroupId: groupId,
          name: f.name,
          price: f.price,
          sambaTagId: f.sambaTagId,
        });
      });
    });

    // Özellik açıklaması
    const featureNames = features.map((f) => f.name).join(', ');
    const fullDisplayName = featureNames ? `${displayName} (${featureNames})` : displayName;

    const basePrice = portion?.price ?? product.Price ?? product.price ?? 0;
    const featuresPrice = calculateFeaturesPrice();
    const itemPrice = basePrice + featuresPrice;

    // Benzersiz key oluştur (ürün + porsiyon + özellikler)
    const featureKey = features.map((f) => f.featureId).sort().join('-');
    const uniqueKey = `${productId}-${portionName}-${featureKey}`;

    // Aynı kombinasyonu bul
    const existingItemIndex = cartItems.findIndex(
      (item: any) => item.uniqueKey === uniqueKey
    );

    if (existingItemIndex >= 0) {
      cartItems[existingItemIndex].quantity += quantity;
    } else {
      cartItems.push({
        id: Date.now(),
        productId: productId,
        sambaId: product.SambaId ?? product.sambaId,
        sambaPortionId: portion?.sambaPortionId,
        portionName: portionName,
        name: fullDisplayName,
        price: itemPrice,
        quantity: quantity,
        image: product.Picture ?? product.picture,
        linkedProductId: product.LinkedProductId ?? product.linkedProductId,
        features: features,
        uniqueKey: uniqueKey,
      });
    }

    saveCart(cartKey, cartItems, customerCode);
    window.dispatchEvent(new Event('cartUpdated'));

    showCartToast(fullDisplayName, '', () => {
      window.dispatchEvent(new CustomEvent('openCart'));
    });

    onClose();
    onAddToCart?.();
  };

  // Özellik yoksa doğrudan sepete ekle
  const handleDirectAddToCart = () => {
    if (!product || !isTableMode || !cartKey || !customerCode) return;

    const cartItems = loadCart(cartKey, customerCode);

    const productId = portion?.id ?? product.Id ?? product.id;
    const portionName = portion?.name || '';
    const productName = getTitle(product, language);
    const displayName = portionName ? `${productName} (${portionName})` : productName;
    const itemPrice = portion?.price ?? product.Price ?? product.price ?? 0;

    const existingItemIndex = cartItems.findIndex(
      (item: any) => item.productId === productId && item.portionName === portionName && !item.features?.length
    );

    if (existingItemIndex >= 0) {
      cartItems[existingItemIndex].quantity += quantity;
    } else {
      cartItems.push({
        id: Date.now(),
        productId: productId,
        sambaId: product.SambaId ?? product.sambaId,
        sambaPortionId: portion?.sambaPortionId,
        portionName: portionName,
        name: displayName,
        price: itemPrice,
        quantity: quantity,
        image: product.Picture ?? product.picture,
        linkedProductId: product.LinkedProductId ?? product.linkedProductId,
      });
    }

    saveCart(cartKey, cartItems, customerCode);
    window.dispatchEvent(new Event('cartUpdated'));

    showCartToast(displayName, '', () => {
      window.dispatchEvent(new CustomEvent('openCart'));
    });

    onClose();
    onAddToCart?.();
  };

  if (!isOpen || !product) return null;

  const productTitle = getTitle(product, language);
  const basePrice = portion?.price ?? product.Price ?? product.price ?? 0;
  const totalPrice = calculateTotalPrice();
  const validationErrors = getValidationErrors();

  // Özellik yoksa veya yükleme tamamlandıysa ve özellik yoksa modal gösterme
  if (!isLoading && featureGroups.length === 0 && !error) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 100001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="feature-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 50px rgba(0, 0, 0, 0.5)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 15px 10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="fas fa-times"></i>
          </button>

          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#fff',
              paddingRight: '35px',
            }}
          >
            {productTitle}
            {portion?.name && (
              <span style={{ fontSize: '12px', color: '#aaa', marginLeft: '6px' }}>
                ({portion.name})
              </span>
            )}
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#888' }}>
            Özelliklerinizi seçin
          </p>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 12px',
          }}
        >
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '25px', color: '#888' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '20px' }}></i>
              <p style={{ marginTop: '8px', fontSize: '13px' }}>Özellikler yükleniyor...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '25px', color: '#e74c3c' }}>
              <i className="fas fa-exclamation-circle" style={{ fontSize: '20px' }}></i>
              <p style={{ marginTop: '8px', fontSize: '13px' }}>{error}</p>
            </div>
          ) : (
            featureGroups.map((group) => {
              const selectedInGroup = selectedFeatures.get(group.id) || [];
              const isGroupRequired = group.isRequired || group.minSelection > 0;

              return (
                <div
                  key={group.id}
                  style={{
                    marginBottom: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '10px',
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {group.name}
                      {isGroupRequired && (
                        <span
                          style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            background: 'rgba(231, 76, 60, 0.2)',
                            color: '#e74c3c',
                            borderRadius: '8px',
                          }}
                        >
                          Zorunlu
                        </span>
                      )}
                    </h3>
                    {(group.minSelection > 0 || group.maxSelection > 0) && (
                      <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#888' }}>
                        {group.minSelection > 0 && `En az ${group.minSelection} `}
                        {group.minSelection > 0 && group.maxSelection > 0 && '- '}
                        {group.maxSelection > 0 && `En fazla ${group.maxSelection} `}
                        seçim
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {/* İstemiyorum seçeneği - sadece minSelection < 1 olanlarda göster */}
                    {(!group.minSelection || group.minSelection < 1) && (
                      <button
                        onClick={() => toggleNoOption(group.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: noOptionSelected.has(group.id)
                            ? 'linear-gradient(135deg, rgba(149, 165, 166, 0.3), rgba(127, 140, 141, 0.3))'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: noOptionSelected.has(group.id)
                            ? '1px solid #95a5a6'
                            : '1px solid transparent',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              background: noOptionSelected.has(group.id) ? '#95a5a6' : 'rgba(255, 255, 255, 0.1)',
                              border: noOptionSelected.has(group.id) ? 'none' : '1.5px solid rgba(255, 255, 255, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {noOptionSelected.has(group.id) && (
                              <i
                                className="fas fa-times"
                                style={{ fontSize: '10px', color: '#fff' }}
                              ></i>
                            )}
                          </div>
                          <span style={{ fontSize: '13px', color: '#bbb', fontWeight: 500 }}>
                            {group.name} istemiyorum
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#888' }}>Ücretsiz</span>
                      </button>
                    )}

                    {group.features.map((feature) => {
                      const isSelected = selectedInGroup.some((f) => f.id === feature.id);

                      return (
                        <button
                          key={feature.id}
                          onClick={() => toggleFeature(group, feature)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            background: isSelected
                              ? 'linear-gradient(135deg, rgba(46, 204, 113, 0.2), rgba(39, 174, 96, 0.2))'
                              : 'rgba(255, 255, 255, 0.05)',
                            border: isSelected
                              ? '1px solid #2ecc71'
                              : '1px solid transparent',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
                                background: isSelected ? '#2ecc71' : 'rgba(255, 255, 255, 0.1)',
                                border: isSelected ? 'none' : '1.5px solid rgba(255, 255, 255, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isSelected && (
                                <i
                                  className="fas fa-check"
                                  style={{ fontSize: '10px', color: '#fff' }}
                                ></i>
                              )}
                            </div>
                            <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>
                              {feature.name}
                            </span>
                          </div>
                          {feature.price > 0 && (
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#2ecc71',
                                fontWeight: 600,
                              }}
                            >
                              +{feature.price.toFixed(2)} TL
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && featureGroups.length > 0 && (
          <div
            style={{
              padding: '10px 12px 15px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div
                style={{
                  marginBottom: '8px',
                  padding: '6px 10px',
                  background: 'rgba(231, 76, 60, 0.1)',
                  borderRadius: '6px',
                  border: '1px solid rgba(231, 76, 60, 0.3)',
                }}
              >
                {validationErrors.map((err, i) => (
                  <p
                    key={i}
                    style={{
                      margin: i === 0 ? 0 : '3px 0 0',
                      fontSize: '11px',
                      color: '#e74c3c',
                    }}
                  >
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '5px' }}></i>
                    {err}
                  </p>
                ))}
              </div>
            )}

            {/* Price Summary */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                  {quantity} adet x {(basePrice + calculateFeaturesPrice()).toFixed(2)} TL
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Toplam</p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {totalPrice.toFixed(2)} TL
                </p>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={!isSelectionValid()}
              style={{
                width: '100%',
                padding: '12px',
                background: isSelectionValid()
                  ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
                  : '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isSelectionValid() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <i className="fas fa-shopping-cart"></i>
              Sepete Ekle
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
