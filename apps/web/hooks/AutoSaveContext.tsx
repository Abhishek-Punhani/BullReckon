import React, { createContext, useContext, useEffect, useRef } from 'react';

interface AutoSaveContextValue {
  autoSave: (data: Record<string, unknown>) => void;
  resetSavedData: () => void;
}

interface AutoSaveProviderProps {
  storageKey: string;
  formData: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  delay?: number;
  children: React.ReactNode;
}

const AutoSaveContext = createContext<AutoSaveContextValue | undefined>(undefined);
export const useAutoSave = () => {
  const context = useContext(AutoSaveContext);
  if (!context) {
    throw new Error('useAutoSave must be used within an AutoSaveProvider');
  }
  return context;
};

export const AutoSaveProvider: React.FC<AutoSaveProviderProps> = ({
  storageKey,
  formData,
  setFormData,
  delay = 500,
  children,
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [formData, storageKey, delay]);

  const autoSave = (data: Record<string, unknown>) => {
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  const resetSavedData = () => {
    localStorage.removeItem(storageKey);
  };

  return (
    <AutoSaveContext.Provider value={{ autoSave, resetSavedData }}>
      {children}
    </AutoSaveContext.Provider>
  );
};
