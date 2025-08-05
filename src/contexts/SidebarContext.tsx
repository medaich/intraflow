import { DEFAULT_SIDEBAR_SIZE } from "@/lib/consts";
import { createContext, useContext, useState, type ReactNode } from "react";

interface SidebarContextValueType {
  isOpen: boolean;
  size: number;
  open: () => void;
  close: () => void;
  resize: (size: number) => void;
}

const defaultValue = {
  isOpen: true,
  size: DEFAULT_SIDEBAR_SIZE,
  open: () => {},
  close: () => {},
  resize: () => {},
};

const SidebarContext = createContext<SidebarContextValueType>(defaultValue);

const SidebarContextProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [size, setSize] = useState(DEFAULT_SIDEBAR_SIZE);

  const open = () => {
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  const resize = (size: number) => {
    setSize(size);
  };
  return (
    <SidebarContext.Provider value={{ isOpen, size, open, close, resize }}>
      {children}
    </SidebarContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context)
    throw new Error("useSidebar was invoked outside SidrbarContext");
  return context;
};

export default SidebarContextProvider;
