"use client"
import { X } from "lucide-react";

export default function Overlay({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark background */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      ></div>

      {/* Content box */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 w-[300px] text-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          <X size={20} />
        </button>

        {children}
      </div>
    </div>
  );
}
