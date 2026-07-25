import { validatePasswordStrength } from '../lib/validation'

interface PasswordStrengthProps {
  password: string
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const { valid, errors } = validatePasswordStrength(password)
  const strength = errors.length === 0 ? 'strong' : errors.length < 3 ? 'medium' : 'weak'
  
  const strengthColors = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500'
  }
  
  return (
    <div className="password-strength mt-2">
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-2 flex-1 rounded-full ${strengthColors[strength as keyof typeof strengthColors]}`} />
        <span className="text-xs text-gray-600 capitalize">{strength}</span>
      </div>
      {errors.length > 0 && (
        <ul className="text-xs text-red-600 space-y-1">
          {errors.map((error, i) => (
            <li key={i}>• {error}</li>
          ))}
        </ul>
      )}
    </div>
  )
}