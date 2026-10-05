import { useI18n } from '../i18n'

interface Props {
  max: number
  onPredict: (n: number) => void
  disabled?: boolean
}

export function PredictionButtons({ max, onPredict, disabled }: Props) {
  const { t } = useI18n()
  const values = Array.from({ length: max + 1 }, (_, i) => i)

  return (
    <div className="panel w-full px-2 py-1.5">
      <p className="mb-1.5 text-center font-body text-base leading-none text-ink sm:text-lg">
        {t('yourPrediction')}
      </p>
      <div className="flex flex-wrap justify-center gap-1">
        {values.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onPredict(n)}
            className="wood-btn min-w-8 px-1.5 py-1 font-pixel text-[12px]"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
