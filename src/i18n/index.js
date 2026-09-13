import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import ptCommon from './locales/pt/common.json'
import ptStatus from './locales/pt/status.json'
import ptNav from './locales/pt/nav.json'
import ptDashboard from './locales/pt/dashboard.json'
import ptCases from './locales/pt/cases.json'
import ptClients from './locales/pt/clients.json'
import ptProposals from './locales/pt/proposals.json'
import ptTasks from './locales/pt/tasks.json'
import ptFinancials from './locales/pt/financials.json'
import ptNotes from './locales/pt/notes.json'
import ptMetrics from './locales/pt/metrics.json'
import ptSettings from './locales/pt/settings.json'
import ptOnboarding from './locales/pt/onboarding.json'
import ptInterns from './locales/pt/interns.json'
import ptVitrine from './locales/pt/vitrine.json'
import ptSupport from './locales/pt/support.json'
import ptAdmin from './locales/pt/admin.json'
import ptImport from './locales/pt/import.json'
import ptUi from './locales/pt/ui.json'
import ptLogin from './locales/pt/login.json'
import ptLanding from './locales/pt/landing.json'

import enCommon from './locales/en/common.json'
import enStatus from './locales/en/status.json'
import enNav from './locales/en/nav.json'
import enDashboard from './locales/en/dashboard.json'
import enCases from './locales/en/cases.json'
import enClients from './locales/en/clients.json'
import enProposals from './locales/en/proposals.json'
import enTasks from './locales/en/tasks.json'
import enFinancials from './locales/en/financials.json'
import enNotes from './locales/en/notes.json'
import enMetrics from './locales/en/metrics.json'
import enSettings from './locales/en/settings.json'
import enOnboarding from './locales/en/onboarding.json'
import enInterns from './locales/en/interns.json'
import enVitrine from './locales/en/vitrine.json'
import enSupport from './locales/en/support.json'
import enAdmin from './locales/en/admin.json'
import enImport from './locales/en/import.json'
import enUi from './locales/en/ui.json'
import enLogin from './locales/en/login.json'
import enLanding from './locales/en/landing.json'

i18next.use(initReactI18next).init({
  fallbackLng: 'pt',
  lng: 'pt',
  interpolation: { escapeValue: false },
  returnNull: false,
  resources: {
    pt: {
      translation: {
        common: ptCommon,
        status: ptStatus,
        nav: ptNav,
        dashboard: ptDashboard,
        cases: ptCases,
        clients: ptClients,
        proposals: ptProposals,
        tasks: ptTasks,
        financials: ptFinancials,
        notes: ptNotes,
        metrics: ptMetrics,
        settings: ptSettings,
        onboarding: ptOnboarding,
        interns: ptInterns,
        vitrine: ptVitrine,
        support: ptSupport,
        admin: ptAdmin,
        import: ptImport,
        ui: ptUi,
        login: ptLogin,
        landing: ptLanding,
      },
    },
    en: {
      translation: {
        common: enCommon,
        status: enStatus,
        nav: enNav,
        dashboard: enDashboard,
        cases: enCases,
        clients: enClients,
        proposals: enProposals,
        tasks: enTasks,
        financials: enFinancials,
        notes: enNotes,
        metrics: enMetrics,
        settings: enSettings,
        onboarding: enOnboarding,
        interns: enInterns,
        vitrine: enVitrine,
        support: enSupport,
        admin: enAdmin,
        import: enImport,
        ui: enUi,
        login: enLogin,
        landing: enLanding,
      },
    },
  },
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18next.language === 'en' ? 'en-US' : 'pt-BR'
  i18next.on('languageChanged', lang => {
    document.documentElement.lang = lang === 'en' ? 'en-US' : 'pt-BR'
  })
}

export default i18next
