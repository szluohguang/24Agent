import { useContext } from 'react'
import { LocaleContext } from './I18nProvider'

export function useLocale() {
  return useContext(LocaleContext)
}
