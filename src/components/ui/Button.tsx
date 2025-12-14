import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary':
              variant === 'primary',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary':
              variant === 'secondary',
            'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground focus:ring-accent':
              variant === 'outline',
            'hover:bg-accent hover:text-accent-foreground focus:ring-accent':
              variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive':
              variant === 'destructive',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
