import { useMemo, useState } from 'react'
import { buildSurveySchema } from '../data/surveySchema'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { QuestionInput } from '../components/QuestionInput'
import { useSurveyFlow } from '../hooks/useSurveyFlow'
import { translations } from '../i18n/translations'
import logo from '../../../assets/logo.png'
import { saveSurveyPromoCode, saveSurveyResponse } from '../services/surveyResponseService'

const getWordsCount = (text) =>
  String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

const getSelectionList = (value) => {
  if (Array.isArray(value)) {
    return value
  }

  if (value && Array.isArray(value.list)) {
    return value.list
  }

  return []
}

const getSingleChoiceValue = (value) => {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object' && typeof value.value === 'string') {
    return value.value
  }

  return ''
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TELEGRAM_PATTERN = /^@?[A-Za-z0-9_]{5,32}$/

const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || '').trim())
const isValidTelegram = (value) => TELEGRAM_PATTERN.test(String(value || '').trim())
const createPromoCode = () => {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `SALOMAT-25-${randomPart}`
}

export const SurveyPage = () => {
  const [locale, setLocale] = useState('uz')
  const [error, setError] = useState('')
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [copiedPromo, setCopiedPromo] = useState(false)
  const t = translations[locale]

  const questions = useMemo(() => buildSurveySchema(t), [t])
  const {
    answers,
    currentQuestion,
    nextTarget,
    status,
    updateAnswer,
    next,
    back,
    restart,
    canGoBack,
  } = useSurveyFlow(questions)

  const currentAnswer = answers[currentQuestion?.id]
  const contactPreference = getSingleChoiceValue(answers.q0)
  const displayQuestion =
    currentQuestion?.id === 'q16'
      ? {
          ...currentQuestion,
          title:
            contactPreference === 'telegram'
              ? t.questions.q16.titleTelegram
              : contactPreference === 'email'
                ? t.questions.q16.titleEmail
                : t.questions.q16.title,
          inputType: contactPreference === 'email' ? 'email' : 'text',
          placeholder:
            contactPreference === 'telegram'
              ? t.questions.q16.placeholderTelegram
              : contactPreference === 'email'
                ? t.questions.q16.placeholderEmail
                : t.questions.q16.placeholder,
        }
      : currentQuestion

  const validate = () => {
    if (!displayQuestion) {
      return false
    }

    if (displayQuestion.type === 'multi_choice') {
      if (!displayQuestion.required) {
        return true
      }
      const selected = getSelectionList(currentAnswer)
      const hasOther = Boolean(currentAnswer?.otherText?.trim())
      if (selected.length === 0 && !hasOther) {
        setError(t.app.requiredError)
        return false
      }
      if (displayQuestion.maxSelect && selected.length > displayQuestion.maxSelect) {
        setError(t.app.maxSelectError.replace('{count}', String(displayQuestion.maxSelect)))
        return false
      }
      return true
    }

    if (displayQuestion.type === 'long_text') {
      if (!displayQuestion.required && !String(currentAnswer || '').trim()) {
        return true
      }
      if (!String(currentAnswer || '').trim()) {
        setError(t.app.requiredError)
        return false
      }
      if ((displayQuestion.minWords ?? 0) > 0 && getWordsCount(currentAnswer) < displayQuestion.minWords) {
        setError(t.app.minWordsError)
        return false
      }
      return true
    }

    if (displayQuestion.type === 'single_choice' || displayQuestion.type === 'yes_no') {
      if (!displayQuestion.required) {
        return true
      }
      const selected = getSingleChoiceValue(currentAnswer)
      if (!selected) {
        setError(t.app.requiredError)
        return false
      }
      if (selected === 'other' && !String(currentAnswer?.otherText ?? '').trim()) {
        setError(t.app.requiredError)
        return false
      }
      return true
    }

    if (displayQuestion.type === 'money') {
      if (!displayQuestion.required) {
        return true
      }
      const amount = Number(currentAnswer?.amount ?? '')
      if (!Number.isFinite(amount) || amount <= 0) {
        setError(t.app.requiredError)
        return false
      }
      return true
    }

    if (displayQuestion.id === 'q16') {
      const contact = String(currentAnswer ?? '').trim()
      if (!contact) {
        setError(t.app.requiredError)
        return false
      }
      if (contactPreference === 'telegram' && !isValidTelegram(contact)) {
        setError(t.app.telegramValidationError)
        return false
      }
      if (contactPreference === 'email' && !isValidEmail(contact)) {
        setError(t.app.emailValidationError)
        return false
      }
      if (contactPreference === 'both' && !isValidEmail(contact) && !isValidTelegram(contact)) {
        setError(t.app.contactValidationError)
        return false
      }
      return true
    }

    if (!displayQuestion.required) {
      return true
    }

    if (!String(currentAnswer ?? '').trim()) {
      setError(t.app.requiredError)
      return false
    }

    return true
  }

  const onNext = async () => {
    if (!validate()) {
      return
    }

    setError('')
    const willFinish = !nextTarget || String(nextTarget).startsWith('end_')
    if (willFinish) {
      const completionStatus =
        nextTarget === 'end_not_relevant'
          ? 'end_not_relevant'
          : nextTarget === 'end_no_contact'
            ? 'end_no_contact'
            : 'complete'
      const shouldIssuePromo = completionStatus !== 'end_not_relevant'
      const generatedPromoCode = shouldIssuePromo ? createPromoCode() : ''
      setPromoCode(generatedPromoCode)
      setCopiedPromo(false)
      setIsFinalSubmitting(true)
      try {
        const responseId = await saveSurveyResponse({ answers, locale, status: completionStatus, questions })
        if (shouldIssuePromo) {
          await saveSurveyPromoCode({
            surveyResponseId: responseId,
            promoCode: generatedPromoCode,
            locale,
            status: completionStatus,
            contactPreference,
            contactValue: String(answers.q16 ?? '').trim(),
          })
        }
      } catch {
        // Keep survey flow going even if save fails.
      } finally {
        setIsFinalSubmitting(false)
      }
    }
    next()
  }

  const onAnswerChange = (value) => {
    if (displayQuestion.type === 'multi_choice') {
      if (Array.isArray(value)) {
        const previousOther = currentAnswer?.otherText ?? ''
        updateAnswer(displayQuestion.id, { list: value, otherText: previousOther })
      } else {
        updateAnswer(displayQuestion.id, value)
      }
    } else {
      updateAnswer(displayQuestion.id, value)
    }
    setError('')
  }

  const onRestart = () => {
    setIsFinalSubmitting(false)
    setPromoCode('')
    setCopiedPromo(false)
    restart()
  }

  const onCopyPromo = async () => {
    if (!promoCode) {
      return
    }
    try {
      await navigator.clipboard.writeText(promoCode)
      setCopiedPromo(true)
    } catch {
      setCopiedPromo(false)
    }
  }

  const renderPromoBlock = () => {
    if (!promoCode) {
      return null
    }
    return (
      <div className="promo-card">
        <p className="promo-title">
          <span className="candy-icon" aria-hidden="true">🍬</span>
          {t.app.promoTitle}
        </p>
        <p className="promo-description">{t.app.promoDescription}</p>
        <div className="promo-code-row">
          <code>{promoCode}</code>
          <button type="button" className="btn btn-muted" onClick={() => void onCopyPromo()}>
            {copiedPromo ? t.app.copiedPromo : t.app.copyPromo}
          </button>
        </div>
        <p className="promo-warning">{t.app.promoWarning}</p>
        <p className="promo-limit">{t.app.promoLimit}</p>
      </div>
    )
  }

  const renderTelegramReminder = () => (
    <a
      className="telegram-reminder"
      href="https://t.me/salomatai"
      target="_blank"
      rel="noreferrer"
    >
      <span className="telegram-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img">
          <path
            fill="currentColor"
            d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0Zm5.894 7.596-1.97 9.29c-.149.658-.538.82-1.09.51l-3.017-2.225-1.455 1.4c-.16.16-.295.295-.604.295l.216-3.06 5.57-5.032c.242-.216-.052-.336-.376-.12l-6.882 4.334-2.965-.925c-.644-.2-.658-.644.135-.955l11.593-4.47c.538-.196 1.008.12.845.958Z"
          />
        </svg>
      </span>
      <span className="telegram-text">
        <span>{t.app.telegramReminder}</span>
        <strong>{t.app.telegramButton}</strong>
      </span>
    </a>
  )

  return (
    <main className="survey-page">
      <div className="survey-card">
        <header className="survey-header">
          <div className="brand-block">
            <img src={logo} alt="SalomatAI logo" className="brand-logo" />
            <h1>{t.app.title}</h1>
            <p>{t.app.subtitle}</p>
          </div>
          <div className="header-actions">
            <span>{t.app.language}</span>
            <LanguageSwitcher label={t.app.language} value={locale} onChange={setLocale} />
          </div>
        </header>

        {status === 'active' && displayQuestion && (
          <>
            <section key={displayQuestion.id} className="question-card question-enter">
              <span className="section-tag">{displayQuestion.section}</span>
              <h2>{displayQuestion.title}</h2>
              {displayQuestion.description && <p className="description">{displayQuestion.description}</p>}

              <QuestionInput
                question={displayQuestion}
                value={currentAnswer}
                onChange={onAnswerChange}
                t={t}
              />

              <p className="draft-note">{t.app.saveDraft}</p>
              {error && <p className="error-text">{error}</p>}
            </section>

            <footer className="action-row">
              <button type="button" className="btn btn-muted" onClick={back} disabled={!canGoBack || isFinalSubmitting}>
                {t.app.back}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void onNext()} disabled={isFinalSubmitting}>
                {isFinalSubmitting ? t.app.savingButton : t.app.next}
              </button>
            </footer>
          </>
        )}

        {status === 'end_not_relevant' && (
          <section className="final-state">
            <h2>{t.app.notRelevantTitle}</h2>
            <p>{t.app.notRelevantDescription}</p>
            {renderTelegramReminder()}
            <button type="button" className="btn btn-primary" onClick={onRestart}>
              {t.app.restart}
            </button>
          </section>
        )}

        {status === 'end_no_contact' && (
          <section className="final-state">
            <h2>{t.app.completedTitle}</h2>
            <p>{t.app.endNoContact}</p>
            {renderPromoBlock()}
            {renderTelegramReminder()}
            <button type="button" className="btn btn-primary" onClick={onRestart}>
              {t.app.restart}
            </button>
          </section>
        )}

        {status === 'complete' && (
          <section className="final-state">
            <h2>{t.app.completedTitle}</h2>
            <p>{t.app.thankYouNote}</p>
            {renderPromoBlock()}
            {renderTelegramReminder()}
            <button type="button" className="btn btn-primary" onClick={onRestart}>
              {t.app.restart}
            </button>
          </section>
        )}
      </div>
    </main>
  )
}
