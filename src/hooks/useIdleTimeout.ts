import { useEffect, useRef } from 'react';

let sessionDeadline = 0;

export function getSessionDeadline() {
  return sessionDeadline;
}

export function useIdleTimeout(onTimeout: () => void, timeoutMinutes: number = 30) {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(onTimeout);

  // Mantém a referência da função de callback sempre atualizada sem causar re-renders
  useEffect(() => {
    callbackRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    
    // Define o prazo final da sessão
    sessionDeadline = Date.now() + timeoutMinutes * 60 * 1000;
    
    // Inicia o cronômetro
    timeoutId.current = setTimeout(() => {
      if (callbackRef.current) callbackRef.current();
    }, timeoutMinutes * 60 * 1000);

    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  }, [timeoutMinutes]); // O cronômetro só reinicia se o usuário mudar a quantidade de minutos
}
