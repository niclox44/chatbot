import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  hint?: string
}

export default function PasswordField({ label, hint, id, ...props }: PasswordFieldProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const [visible, setVisible] = useState(false)
  return (
    <div className="auth-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="auth-password">
        <input {...props} id={inputId} type={visible ? 'text' : 'password'} aria-describedby={hint ? `${inputId}-hint` : props['aria-describedby']} />
        <button type="button" onClick={() => setVisible(!visible)} aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-controls={inputId} aria-pressed={visible}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <small id={`${inputId}-hint`}>{hint}</small>}
    </div>
  )
}
