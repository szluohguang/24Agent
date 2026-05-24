import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import { IntlProvider } from 'react-intl'
import zhCN from './zh-CN.json'
import enUS from './en-US.json'

type Locale = 'zh-CN' | 'en'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: 'zh-CN',
  setLocale: () => {},
})

const STORAGE_KEY = '24h-agent-locale'

const messages: Record<Locale, Record<string, string>> = {
  'zh-CN': zhCN,
  en: enUS,
}

function detectLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored === 'zh-CN' || stored === 'en') return stored
  const lang = navigator.language
  if (lang === 'zh-CN' || lang === 'zh') return 'zh-CN'
  return 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = locale === 'zh-CN' ? '24h Agent 编排器' : '24h Agent Orchestrator'
  }, [locale])

  const ctx = useMemo(() => ({ locale, setLocale }), [locale, setLocale])

  return (
    <LocaleContext.Provider value={ctx}>
      <IntlProvider messages={messages[locale]} locale={locale} defaultLocale="en">
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  )
}
