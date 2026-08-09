import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import BadgeChip from './BadgeChip'

describe('BadgeChip', () => {
  it('renders the Gold badge with its styling', () => {
    render(<BadgeChip badge="Gold" />)

    expect(screen.getByText('Gold')).toBeInTheDocument()
    expect(screen.getByText('Gold')).toHaveClass('bg-amber-100')
  })

  it('renders the Silver badge with its styling', () => {
    render(<BadgeChip badge="Silver" />)

    expect(screen.getByText('Silver')).toBeInTheDocument()
    expect(screen.getByText('Silver')).toHaveClass('bg-slate-200')
  })

  it('renders the Bronze badge with its styling', () => {
    render(<BadgeChip badge="Bronze" />)

    expect(screen.getByText('Bronze')).toBeInTheDocument()
    expect(screen.getByText('Bronze')).toHaveClass('bg-orange-100')
  })

  it('renders a fallback message when there is no badge', () => {
    render(<BadgeChip badge={null} />)

    expect(screen.getByText('No badge yet')).toBeInTheDocument()
    expect(screen.queryByText('Gold')).not.toBeInTheDocument()
  })
})
