import { useI18n } from '../i18n'

interface Props {
  open: boolean
  onClose: () => void
}

export function HelpModal({ open, onClose }: Props) {
  const { t } = useI18n()
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-dark/50 px-3 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      onClick={onClose}
    >
      <div
        className="panel max-h-[85dvh] w-full max-w-md overflow-y-auto px-5 py-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="help-title" className="font-pixel text-[14px] leading-relaxed text-forest-dark">
            {t('help')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="wood-btn px-3 py-2 font-pixel text-[12px]"
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 font-body text-xl leading-snug text-ink">
          <p>{t('helpLead')}</p>
          <p>
            <strong>{t('helpTrump').split(':')[0]}:</strong>
            {t('helpTrump').slice(t('helpTrump').indexOf(':') + 1)}
          </p>
          <p>
            <strong>{t('helpFollow').split(':')[0]}:</strong>
            {t('helpFollow').slice(t('helpFollow').indexOf(':') + 1)}
          </p>
          <p>
            <strong>{t('helpRounds').split(':')[0]}:</strong>
            {t('helpRounds').slice(t('helpRounds').indexOf(':') + 1)}
          </p>
          <p>
            <strong>{t('helpLeadPlay').split(':')[0]}:</strong>
            {t('helpLeadPlay').slice(t('helpLeadPlay').indexOf(':') + 1)}
          </p>
          <p>
            <strong>{t('helpPoints').split(':')[0]}:</strong>
            {t('helpPoints').slice(t('helpPoints').indexOf(':') + 1)}
          </p>
          <p>{t('helpBots')}</p>
        </div>

        <button type="button" onClick={onClose} className="wood-btn wood-btn-lg mt-5 w-full">
          {t('gotIt')}
        </button>
      </div>
    </div>
  )
}
