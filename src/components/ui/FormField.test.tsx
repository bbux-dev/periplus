import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormField } from './FormField'

describe('FormField', () => {
  it('renders a label associated with the input via htmlFor/id (getByLabelText works)', () => {
    render(<FormField id="url" label="URL" />)
    // getByLabelText traverses htmlFor → id association
    expect(screen.getByLabelText('URL')).toBeInTheDocument()
    expect(screen.getByLabelText('URL').tagName).toBe('INPUT')
  })

  it('forwards input props (value, onChange, placeholder) to the inner Input', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(
      <FormField
        id="title"
        label="Title"
        value=""
        onChange={handleChange}
        placeholder="Enter title..."
      />
    )
    expect(screen.getByPlaceholderText('Enter title...')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Title'), 'hello')
    expect(handleChange).toHaveBeenCalled()
  })

  it('renders role=alert with error text, aria-invalid=true, and aria-describedby pointing at error when error is set', () => {
    render(<FormField id="url" label="URL" error="Invalid URL" />)
    const input = screen.getByLabelText('URL')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Invalid URL')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'url-error')
    expect(alert).toHaveAttribute('id', 'url-error')
  })

  it('renders help text linked via aria-describedby when helpText is set and no error present; aria-invalid is not true', () => {
    render(<FormField id="url" label="URL" helpText="Paste a URL to import" />)
    const input = screen.getByLabelText('URL')
    const help = screen.getByText('Paste a URL to import')
    expect(help).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-describedby', 'url-help')
    expect(input).not.toHaveAttribute('aria-invalid', 'true')
  })
})
