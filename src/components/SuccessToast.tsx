import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../stores/appStore";

const TOAST_DURATION = 4000; // ms

export default function SuccessToast() {
  const toastMessage = useAppStore((s) => s.toastMessage);
  const hideToast = useAppStore((s) => s.hideToast);
  const setDishStatus = useAppStore((s) => s.setDishStatus);
  const dishes = useAppStore((s) => s.dishes);

  const [isVisible, setIsVisible] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track which dish was just logged so undo works after toast hides
  const loggedDishRef = useRef<number | null>(null);

  // Find the most recently tried dish to support undo
  useEffect(() => {
    if (toastMessage !== null) {
      // Find the dish by name to get its ID for undo
      const dish = dishes.find((d) => d.name === toastMessage.dishName);
      if (dish) loggedDishRef.current = dish.id;

      // Slide in
      const animId = requestAnimationFrame(() => setIsVisible(true));

      // Auto-dismiss after duration
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        hideTimerRef.current = setTimeout(() => {
          hideToast();
          hideTimerRef.current = null;
        }, 400);
        dismissTimerRef.current = null;
      }, TOAST_DURATION);

      return () => {
        cancelAnimationFrame(animId);
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      };
    } else {
      setIsVisible(false);
    }
  }, [toastMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleUndo = () => {
    const dishId = loggedDishRef.current;
    if (dishId !== null) {
      setDishStatus(dishId, "untried");
    }
    // Cancel auto-dismiss and hide immediately
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsVisible(false);
    hideTimerRef.current = setTimeout(() => {
      hideToast();
      hideTimerRef.current = null;
    }, 400);
  };

  const handleDismiss = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsVisible(false);
    hideTimerRef.current = setTimeout(() => {
      hideToast();
      hideTimerRef.current = null;
    }, 400);
  };

  if (toastMessage === null) return null;

  const { dishName, countryName, countryFlag, isFirstInCountry } = toastMessage;

  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9000] transition-all duration-400 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
      role="status"
      aria-live="polite"
    >
      {/* Sparkle decorations for first-in-country */}
      {isFirstInCountry && (
        <>
          <span className="absolute -top-2 -left-3 text-xl pointer-events-none select-none animate-bounce">✨</span>
          <span className="absolute -top-2 -right-3 text-xl pointer-events-none select-none animate-bounce" style={{ animationDelay: "0.15s" }}>✨</span>
        </>
      )}

      {/* Toast card */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-green-400 shadow-xl shadow-green-100 min-w-[280px] max-w-sm">
        {/* Check icon */}
        <div className="shrink-0 w-9 h-9 rounded-full bg-green-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-snug">
            {dishName} logged!
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {countryFlag} {countryName}
            {isFirstInCountry && (
              <span className="ml-1 font-semibold text-green-600"> · your 1st dish here</span>
            )}
          </p>
        </div>

        {/* Undo + close */}
        <div className="shrink-0 flex items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            className="text-xs font-semibold text-amber-600 hover:text-amber-800 hover:underline transition-colors px-1 py-0.5"
          >
            undo
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-1.5 h-0.5 rounded-full overflow-hidden bg-green-100">
        <div
          className="h-full bg-green-400 origin-left"
          style={{
            animation: isVisible ? `shrink ${TOAST_DURATION}ms linear forwards` : "none",
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
