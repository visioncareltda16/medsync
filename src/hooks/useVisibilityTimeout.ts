import { useEffect, useRef } from 'react';
import { useUIStore } from '@/store/useUIStore';

export function useVisibilityTimeout() {
  const { showValues, setShowValues, visibilityTimeout } = useUIStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Limpa o timeout existente se houver
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Inicia a contagem contínua se os valores estiverem visíveis e um tempo for selecionado
    if (showValues && visibilityTimeout > 0) {
      timeoutRef.current = setTimeout(() => {
        setShowValues(false);
      }, visibilityTimeout * 60 * 1000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showValues, visibilityTimeout, setShowValues]);
}
