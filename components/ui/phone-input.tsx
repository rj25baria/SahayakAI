'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface PhoneInputProps {
  value?: string;
  onChange?: (val: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

const COUNTRY_CODES = [
  { code: '+91', country: '🇮🇳 IN' },
  { code: '+1', country: '🇺🇸 US' },
  { code: '+44', country: '🇬🇧 UK' },
  { code: '+61', country: '🇦🇺 AU' },
  { code: '+971', country: '🇦🇪 UAE' },
  { code: '+65', country: '🇸🇬 SG' },
];

export function PhoneInput({
  value = '',
  onChange,
  id,
  name,
  placeholder = '98765 43210',
  className,
  disabled,
  required,
}: PhoneInputProps) {
  const parseValue = React.useCallback((val: string) => {
    let matchedCode = '+91';
    let digitsOnly = val ? val.replace(/\D/g, '') : '';

    for (const c of COUNTRY_CODES) {
      const codeDigits = c.code.replace(/\D/g, '');
      if (digitsOnly.startsWith(codeDigits)) {
        matchedCode = c.code;
        digitsOnly = digitsOnly.slice(codeDigits.length);
        break;
      }
    }

    const numberBody = digitsOnly.slice(0, 10);
    return { countryCode: matchedCode, numberBody };
  }, []);

  const [state, setState] = React.useState(() => parseValue(value));

  React.useEffect(() => {
    setState(parseValue(value));
  }, [value, parseValue]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setState((prev) => {
      const next = { ...prev, countryCode: newCode };
      emitChange(newCode, prev.numberBody);
      return next;
    });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setState((prev) => {
      const next = { ...prev, numberBody: raw };
      emitChange(prev.countryCode, raw);
      return next;
    });
  };

  const emitChange = (code: string, body: string) => {
    if (!onChange) return;
    if (!body) {
      onChange('');
    } else {
      onChange(`${code} ${body}`);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex rounded-md shadow-sm">
        <select
          value={state.countryCode}
          onChange={handleCountryChange}
          disabled={disabled}
          aria-label="Select Country Code"
          className="flex h-11 items-center justify-center rounded-l-md border border-r-0 border-input bg-muted/60 px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.country} ({c.code})
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <Input
            id={id}
            name={name}
            type="tel"
            inputMode="numeric"
            value={state.numberBody}
            onChange={handleNumberChange}
            maxLength={10}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className="h-11 rounded-l-none pl-3 pr-14 font-mono text-sm tracking-wider focus-visible:ring-1"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span
              className={cn(
                'text-[10px] font-mono font-medium px-1.5 py-0.5 rounded transition-colors',
                state.numberBody.length === 10
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                  : state.numberBody.length > 0
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground'
              )}
            >
              {state.numberBody.length}/10
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
