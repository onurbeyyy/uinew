'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { CartItem, Product, ProductPortion, ProductProperty } from '@/types/api';

interface CartContextType {
  items: CartItem[];
  addItem: (
    product: Product,
    portion?: ProductPortion,
    properties?: ProductProperty[],
    quantity?: number,
    note?: string
  ) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const calculateItemPrice = (
    product: Product,
    portion?: ProductPortion,
    properties?: ProductProperty[]
  ): number => {
    let price = portion ? portion.price : product.price;

    if (properties && properties.length > 0) {
      price += properties.reduce((sum, prop) => sum + prop.price, 0);
    }

    return price;
  };

  const addItem = (
    product: Product,
    portion?: ProductPortion,
    properties: ProductProperty[] = [],
    quantity: number = 1,
    note?: string
  ) => {
    const totalPrice = calculateItemPrice(product, portion, properties) * quantity;

    const newItem: CartItem = {
      product,
      portion,
      properties,
      quantity,
      note,
      totalPrice,
    };

    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }

    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const unitPrice = calculateItemPrice(item.product, item.portion, item.properties);
          return {
            ...item,
            quantity,
            totalPrice: unitPrice * quantity,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalPrice = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalPrice,
        getTotalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
