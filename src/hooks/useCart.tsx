import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const selectedProduct = cart.find((product) => product.id === productId);

      const stockResponse = await api.get<Stock>(`stock/${productId}`);
      const { amount } = stockResponse.data;

      if (!selectedProduct) {
        const productResponse = await api.get(`products/${productId}`);
        const { data } = productResponse;
        const product = { ...data, amount: 1 };
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, product])
        );

        setCart([...cart, product]);
      } else {
        if (amount < selectedProduct.amount + 1) {
          toast.error(`Quantidade solicitada fora do estoque`);
          return;
        }
        const newCart = cart.map((product) =>
          product.id === productId
            ? { ...product, amount: product.amount + 1 }
            : { ...product }
        );
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

        setCart(newCart);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newProductsState = cart.filter(
        (product) => product.id !== productId
      );

      const hasProduct = cart.findIndex((product) => product.id === productId);
      if (hasProduct >= 0) {
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(newProductsState)
        );

        setCart(newProductsState);
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stockResponse = await api.get<Stock>(`stock/${productId}`);

      if (amount <= stockResponse.data.amount) {
        console.log(stockResponse.data.amount < amount);
        const newCart = cart.map((product) =>
          product.id === productId ? { ...product, amount } : { ...product }
        );
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

        setCart(newCart);
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
