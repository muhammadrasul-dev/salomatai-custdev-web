const LANGUAGES = [
  { key: 'uz', label: "O'z" },
  { key: 'ru', label: 'Ru' },
  { key: 'en', label: 'En' },
]

export const LanguageSwitcher = ({ label, value, onChange }) => (
  <div className="language-switcher" aria-label={label}>
    {LANGUAGES.map((language) => (
      <button
        key={language.key}
        type="button"
        onClick={() => onChange(language.key)}
        className={`lang-btn ${value === language.key ? 'is-active' : ''}`}
      >
        {language.label}
      </button>
    ))}
  </div>
)
