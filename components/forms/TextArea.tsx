/**
 * TextArea Component
 * 
 * Reusable textarea with label and error handling
 */

import React from 'react';

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
  rows?: number;
  maxLength?: number;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  helperText,
  rows = 4,
  maxLength,
}) => {
  const remainingChars = maxLength ? maxLength - value.length : undefined;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {maxLength && (
          <span className={`text-xs ${remainingChars && remainingChars < 100 ? 'text-orange-400' : 'text-gray-500'}`}>
            {remainingChars} characters remaining
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`
          px-3 py-2 bg-gray-800 border rounded-lg
          text-gray-100 placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          resize-y
          ${error ? 'border-red-500' : 'border-gray-700'}
        `}
      />
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
      {helperText && !error && (
        <span className="text-xs text-gray-500">{helperText}</span>
      )}
    </div>
  );
};

