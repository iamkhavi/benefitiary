import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
    className?: string
    width?: number
    height?: number
    priority?: boolean
}

export function Logo({ className, width = 206, height = 33, priority = false }: LogoProps) {
    return (
        <Image
            src="/logo.svg"
            alt="Benefitiary"
            width={width}
            height={height}
            priority={priority}
            className={cn("h-auto", className)}
        />
    )
}

export function LogoIcon({ className, width = 31, height = 28, priority = false }: LogoProps) {
    return (
        <Image
            src="/favicon.svg"
            alt="Benefitiary"
            width={width}
            height={height}
            priority={priority}
            className={cn("h-auto", className)}
        />
    )
}