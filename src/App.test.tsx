import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const shareCardMock = vi.hoisted(() => ({ createDepartureShareCard: vi.fn() }))

vi.mock('./lib/shareCard.js', () => shareCardMock)

import App from './App.js'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '/?lang=en')
    shareCardMock.createDepartureShareCard.mockResolvedValue(new File(['card'], 'ady.png', { type: 'image/png' }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes a concise route workspace with no default favorites', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Closest train' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Upcoming/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('No saved routes yet')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Route lines' })).not.toBeInTheDocument()
  })

  it('switches language, day type, stations, and the visible departure tab', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'RU' }))
    expect(screen.getByRole('button', { name: 'RU' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('tab', { name: 'Рабочий' }))
    expect(screen.getByRole('tab', { name: 'Рабочий' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.change(screen.getByRole('combobox', { name: 'Куда' }), { target: { value: 'Xırdalan' } })
    await waitFor(() => expect(screen.getByText('Bakı - Xırdalan')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: /Ушедшие/ }))
    expect(screen.getByRole('tab', { name: /Ушедшие/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByText('Ушел').length).toBeGreaterThan(0)
  })

  it('saves, applies, and removes a user favorite', async () => {
    render(<App />)

    fireEvent.change(screen.getByRole('combobox', { name: 'To' }), { target: { value: 'Xırdalan' } })
    await waitFor(() => expect(screen.getByText('Bakı - Xırdalan')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Add to favorites' }))
    expect(screen.getByRole('button', { name: 'Bakı Xırdalan' })).toBeInTheDocument()
    expect(window.localStorage.getItem('ady-schedule-favorites:v1')).toContain('Xırdalan')

    fireEvent.click(screen.getByRole('button', { name: 'Swap' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bakı Xırdalan' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Bakı Xırdalan' }))
    expect(screen.getByRole('combobox', { name: 'From' })).toHaveValue('Bakı')
    expect(screen.getByRole('combobox', { name: 'To' })).toHaveValue('Xırdalan')

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.getByText('No saved routes yet')).toBeInTheDocument()
  })

  it('shares the generated PNG when the device share sheet supports files', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: vi.fn().mockReturnValue(true) })
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Share' })[0])

    await waitFor(() => expect(shareCardMock.createDepartureShareCard).toHaveBeenCalledOnce())
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: expect.any(Array) }))
  })
})
