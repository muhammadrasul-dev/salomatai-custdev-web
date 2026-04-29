export const ProgressBar = ({ label, value }) => (
  <section className="progress">
    <div className="progress-head">
      <span>{label}</span>
      <strong>{value}%</strong>
    </div>
    <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  </section>
)
