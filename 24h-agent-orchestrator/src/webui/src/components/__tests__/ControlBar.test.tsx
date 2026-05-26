// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { ControlBar } from '../ControlBar.js'

afterEach(cleanup)

function renderWithIntl(ui: React.ReactElement) {
  return render(<IntlProvider locale="en" messages={{}} defaultLocale="en">{ui}</IntlProvider>)
}

describe('ControlBar', () => {
  const baseProps = {
    connected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    permissionLevel: 'safe',
    onSetPermission: () => {},
    onCreateTask: () => {},
  }

  it('shows disconnected status by default', () => {
    renderWithIntl(<ControlBar {...baseProps} />)
    expect(screen.getByText(/status\.disconnected/)).toBeInTheDocument()
  })

  it('shows connected status when connected', () => {
    renderWithIntl(<ControlBar {...baseProps} connected={true} />)
    expect(screen.getByText(/status\.connected/)).toBeInTheDocument()
  })

  it('shows reconnecting status during reconnection', () => {
    renderWithIntl(<ControlBar {...baseProps} isReconnecting={true} reconnectAttempts={3} />)
    expect(screen.getByText(/controlbar\.reconnecting/)).toBeInTheDocument()
  })

  it('renders permission selector', () => {
    renderWithIntl(<ControlBar {...baseProps} />)
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('safe')
  })

  it('renders language toggle button', () => {
    renderWithIntl(<ControlBar {...baseProps} />)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('renders task input and add button', () => {
    renderWithIntl(<ControlBar {...baseProps} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText(/button\.addTask/)).toBeInTheDocument()
  })

  it('calls onCreateTask when form submitted', () => {
    const onCreateTask = vi.fn()
    renderWithIntl(<ControlBar {...baseProps} onCreateTask={onCreateTask} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'my task' } })
    fireEvent.submit(input.closest('form')!)
    expect(onCreateTask).toHaveBeenCalledWith('my task')
  })

  it('does not call onCreateTask for empty input', () => {
    const onCreateTask = vi.fn()
    renderWithIntl(<ControlBar {...baseProps} onCreateTask={onCreateTask} />)
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(onCreateTask).not.toHaveBeenCalled()
  })

  it('calls onSetPermission when selector changes', () => {
    const onSetPermission = vi.fn()
    renderWithIntl(<ControlBar {...baseProps} onSetPermission={onSetPermission} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'strict' } })
    expect(onSetPermission).toHaveBeenCalledWith('strict')
  })
})
