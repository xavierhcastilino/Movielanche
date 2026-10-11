import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
}

export function OtpInput({ value, onChange, length = 6, disabled = false, invalid = false, label }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);

  const setDigit = (index: number, digit: string) => {
    const chars = value.padEnd(length, ' ').split('');
    chars[index] = digit || ' ';
    onChange(chars.join('').replace(/ /g, '').slice(0, length));
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) { setDigit(index, ''); return; }
    if (digits.length > 1) {
      const next = (value.slice(0, index) + digits).slice(0, length);
      onChange(next);
      refs.current[Math.min(next.length, length - 1)]?.focus();
      return;
    }
    const chars = value.split('');
    chars[index] = digits;
    onChange(chars.join('').slice(0, length));
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKey = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) { event.preventDefault(); onChange(value.slice(0, index - 1)); refs.current[index - 1]?.focus(); }
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!digits) return;
    event.preventDefault();
    onChange(digits);
    refs.current[Math.min(digits.length, length - 1)]?.focus();
  };

  return (
    <div className="otp-boxes" role="group" aria-label={label}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(node) => { refs.current[index] = node; }}
          className={`otp-box${invalid ? ' is-invalid' : ''}${value[index] ? ' is-filled' : ''}`}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={index === 0 ? length : 1}
          value={value[index] ?? ''}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKey(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  );
}
