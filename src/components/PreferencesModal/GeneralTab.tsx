import React, { useCallback } from 'react'
import Icon from '../atoms/Icon'
import { mdiPlus, mdiLoading } from '@mdi/js'
import {
  Section,
  SectionHeader,
  SectionControl,
  SectionSelect,
  SectionPrimaryButton
} from './styled'
import {
  usePreferences,
  GeneralThemeOptions,
  GeneralLanguageOptions,
  GeneralNoteSortingOptions
} from '../../lib/preferences'
import { useTranslation } from 'react-i18next'
import { SelectChangeEventHandler } from '../../lib/events'
import { useUsers } from '../../lib/accounts'
import UserInfo from '../atoms/UserInfo'
import LoginButton from '../atoms/LoginButton'

const GeneralTab = () => {
  const { preferences, setPreferences } = usePreferences()
  const [users, { removeUser }] = useUsers()

  const selectTheme: SelectChangeEventHandler = useCallback(
    event => {
      setPreferences({
        'general.theme': event.target.value as GeneralThemeOptions
      })
    },
    [setPreferences]
  )

  const selectLanguage: SelectChangeEventHandler = useCallback(
    event => {
      setPreferences({
        'general.language': event.target.value as GeneralLanguageOptions
      })
    },
    [setPreferences]
  )

  const selectNoteSorting: SelectChangeEventHandler = useCallback(
    event => {
      setPreferences({
        'general.noteSorting': event.target.value as GeneralNoteSortingOptions
      })
    },
    [setPreferences]
  )

  const { t } = useTranslation()

  return (
    <div>
      <Section>
        <SectionHeader>{t('preferences.account')}</SectionHeader>
        <div>
          {users.map(user => (
            <UserInfo key={user.id} user={user} signout={removeUser} />
          ))}
          <LoginButton
            onErr={console.error /* TODO: Toast error */}
            ButtonComponent={SectionPrimaryButton}
          >
            {loginState =>
              loginState !== 'logging-in' ? (
                <>
                  <Icon path={mdiPlus} />
                  {t(
                    users.length === 0
                      ? 'preferences.addAccount'
                      : 'preferences.switchAccount'
                  )}
                </>
              ) : (
                <>
                  <Icon path={mdiLoading} />
                  {t('preferences.loginWorking')}
                </>
              )
            }
          </LoginButton>
        </div>
      </Section>
      <Section>
        <SectionHeader>{t('preferences.interfaceLanguage')}</SectionHeader>
        <SectionControl>
          <SectionSelect
            value={preferences['general.language']}
            onChange={selectLanguage}
          >
            <option value='en-US'>English (US)</option>
            <option value='ja'>日本語</option>
          </SectionSelect>
        </SectionControl>
      </Section>
      <Section>
        <SectionHeader>{t('preferences.applicationTheme')}</SectionHeader>
        <SectionControl>
          <SectionSelect
            value={preferences['general.theme']}
            onChange={selectTheme}
          >
            <option value='auto'>{t('preferences.auto')}</option>
            <option value='light'>{t('preferences.light')}</option>
            <option value='dark'>{t('preferences.dark')}</option>
            <option value='solarized-dark'>
              {t('preferences.solarizedDark')}
            </option>
          </SectionSelect>
        </SectionControl>
      </Section>
      <Section>
        <SectionHeader>{t('preferences.noteSorting')}</SectionHeader>
        <SectionControl>
          <SectionSelect
            value={preferences['general.noteSorting']}
            onChange={selectNoteSorting}
          >
            <option value='date-updated'>{t('preferences.dateUpdated')}</option>
            <option value='date-created'>{t('preferences.dateCreated')}</option>
            <option value='title'>{t('preferences.title')}</option>
          </SectionSelect>
        </SectionControl>
      </Section>
    </div>
  )
}

export default GeneralTab
