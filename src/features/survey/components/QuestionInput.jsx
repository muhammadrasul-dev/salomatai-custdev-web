import { useMemo } from 'react'

export const QuestionInput = ({ question, value, onChange, t }) => {
  const normalizedValue = useMemo(() => {
    if (question.type === 'multi_choice') {
      return value ?? []
    }
    if (question.type === 'money') {
      return value ?? { amount: '', currency: question.defaultCurrency ?? 'USD' }
    }
    return value ?? ''
  }, [question.type, question.defaultCurrency, value])
  const selectedList = Array.isArray(normalizedValue)
    ? normalizedValue
    : Array.isArray(normalizedValue?.list)
      ? normalizedValue.list
      : []
  const selectedSingleValue =
    typeof normalizedValue === 'string'
      ? normalizedValue
      : typeof normalizedValue?.value === 'string'
        ? normalizedValue.value
        : ''
  const singleOtherValue = typeof normalizedValue?.otherText === 'string' ? normalizedValue.otherText : ''

  if (question.type === 'single_choice' || question.type === 'yes_no') {
    return (
      <div className="options">
        {question.options.map((option) => (
          <label key={option.value} className={`option ${selectedSingleValue === option.value ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name={question.id}
              checked={selectedSingleValue === option.value}
              onChange={() =>
                onChange(
                  question.allowOtherText ? { value: option.value, otherText: '' } : option.value,
                )
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
        {question.allowOtherText && (
          <>
            <label className={`option ${selectedSingleValue === 'other' ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name={question.id}
                checked={selectedSingleValue === 'other'}
                onChange={() => onChange({ value: 'other', otherText: singleOtherValue })}
              />
              <span>{t.app.otherLabel}</span>
            </label>
            {selectedSingleValue === 'other' && (
              <div className="other-box">
                <input
                  type="text"
                  value={singleOtherValue}
                  placeholder={t.app.otherPlaceholder}
                  onChange={(event) => onChange({ value: 'other', otherText: event.target.value })}
                />
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  if (question.type === 'multi_choice') {
    const toggle = (optionValue) => {
      const list = selectedList
      if (list.includes(optionValue)) {
        onChange(list.filter((item) => item !== optionValue))
      } else {
        onChange([...list, optionValue])
      }
    }

    const otherValue = typeof normalizedValue?.otherText === 'string' ? normalizedValue.otherText : ''

    return (
      <div className="options">
        {question.options.map((option) => (
          <label key={option.value} className={`option ${selectedList.includes(option.value) ? 'is-selected' : ''}`}>
            <input
              type="checkbox"
              checked={selectedList.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
        {question.allowOtherText && (
          <div className="other-box">
            <label>{t.app.otherLabel}</label>
            <input
              type="text"
              value={otherValue}
              placeholder={t.app.otherPlaceholder}
              onChange={(event) => onChange({ list: selectedList, otherText: event.target.value })}
            />
          </div>
        )}
      </div>
    )
  }

  if (question.type === 'scale') {
    return (
      <div className="scale-options">
        {Array.from({ length: question.max - question.min + 1 }, (_, index) => {
          const scaleValue = question.min + index
          return (
            <label key={scaleValue} className={`scale-item ${Number(normalizedValue) === scaleValue ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name={question.id}
                checked={Number(normalizedValue) === scaleValue}
                onChange={() => onChange(scaleValue)}
              />
              <span>{scaleValue}</span>
            </label>
          )
        })}
      </div>
    )
  }

  if (question.type === 'short_text' || question.type === 'long_text') {
    const isLong = question.type === 'long_text'
    const InputTag = isLong ? 'textarea' : 'input'
    const inputProps = isLong ? { rows: 5 } : { type: question.inputType ?? 'text' }

    return (
      <div className="text-answer">
        <InputTag
          {...inputProps}
          value={String(normalizedValue)}
          placeholder={question.placeholder ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    )
  }

  if (question.type === 'money') {
    const amount = normalizedValue?.amount ?? ''
    const currency = normalizedValue?.currency ?? question.defaultCurrency ?? 'USD'
    const rateUsdToUzs = 12700
    const parsedAmount = Number(amount)
    const isValidNumber = Number.isFinite(parsedAmount) && parsedAmount > 0
    const converted =
      currency === 'USD'
        ? `${(parsedAmount * rateUsdToUzs).toLocaleString()} UZS`
        : `${(parsedAmount / rateUsdToUzs).toFixed(2)} USD`

    return (
      <div className="money-answer">
        <div className="money-row">
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            placeholder={t.app.amountPlaceholder}
            onChange={(event) => onChange({ amount: event.target.value, currency })}
          />
          <select value={currency} onChange={(event) => onChange({ amount, currency: event.target.value })}>
            {question.currencies?.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="currency-switch-btn"
            onClick={() => {
              const nextCurrency = currency === 'USD' ? 'UZS' : 'USD'
              const nextAmount = isValidNumber
                ? currency === 'USD'
                  ? (parsedAmount * rateUsdToUzs).toFixed(0)
                  : (parsedAmount / rateUsdToUzs).toFixed(2)
                : amount
              onChange({ amount: nextAmount, currency: nextCurrency })
            }}
          >
            {t.app.switchCurrency}
          </button>
        </div>
        {isValidNumber && <p className="converted-note">{t.app.convertedAmount}: {converted}</p>}
      </div>
    )
  }

  return null
}
