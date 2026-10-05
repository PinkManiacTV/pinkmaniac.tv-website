interface Props {
  max: number
  onPredict: (n: number) => void
  disabled?: boolean
}

export function PredictionButtons({ max, onPredict, disabled }: Props) {
  const values = Array.from({ length: max + 1 }, (_, i) => i)

  return (
    <div className="panel w-full px-2.5 py-2.5">
      <p className="mb-2 text-center font-body text-lg leading-none text-ink">
        Jouw voorspelling
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {values.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onPredict(n)}
            className="wood-btn min-w-9 px-2 py-1.5 font-pixel text-[13px]"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
