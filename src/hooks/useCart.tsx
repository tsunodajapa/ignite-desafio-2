import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { setConstantValue } from 'typescript';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => Promise<void>;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: product } = await api.get<Product>(`products/${productId}`);
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      const productFoundIndex = cart.findIndex(
        productSearch => productSearch.id === productId,
      );

      if (productFoundIndex === -1 && stock.amount > 0) {
        const newProduct = {
          ...product,
          amount: 1,
        };

        const newProducts = [...cart, newProduct];

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(newProducts),
        );

        setCart(newProducts);
      } else if (stock.amount >= cart[productFoundIndex].amount + 1) {
        await updateProductAmount({ productId, amount: cart[productFoundIndex].amount + 1 })
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newProducts = cart.filter(
        product => product.id !== productId,
      );

      if (newProducts.length === cart.length) {
        throw new Error();
      }

      setCart(newProducts);

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(newProducts),
      );

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount >= 1) {
        const stock = await api.get<Stock>(`stock/${productId}`);
               
        console.log(stock.data, amount);
        if (stock.data.amount < amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        const newCart = cart.map(product => {
          if (product.id === productId) {
            
            return {
              ...product,
              amount,
            }
          }
          
          return product;
        })
        

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(newCart),
        );

        setCart(newCart);
      }
    } catch (error) {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
