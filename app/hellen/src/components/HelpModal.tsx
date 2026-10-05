interface Props {
  open: boolean
  onClose: () => void
}

export function HelpModal({ open, onClose }: Props) {
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
            Uitleg
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="wood-btn px-3 py-2 font-pixel text-[12px]"
            aria-label="Sluiten"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 font-body text-xl leading-snug text-ink">
          <p>
            <strong>Wel bekennen, he!</strong> — voorspel hoeveel slagen je haalt, en probeer exact
            goed te zitten.
          </p>
          <p>
            <strong>Troef:</strong> harten is altijd troef. Hoogste troef wint de slag. Zonder troef
            wint de hoogste kaart van de uitgekomen kleur.
          </p>
          <p>
            <strong>Meekleur:</strong> je moet de kleur van de eerste kaart volgen als je die hebt.
            Anders mag je alles spelen (ook troef).
          </p>
          <p>
            <strong>Rondes:</strong> start met 1 kaart, stijgt tot max, speelt die max-ronde twee
            keer, daarna weer terug naar 1.
          </p>
          <p>
            <strong>Uitkomen:</strong> wie het hoogst voorspelt, speelt de eerste kaart. Bij
            gelijke voorspelling begint wie eerder aan de beurt was in de voorspelronde.
          </p>
          <p>
            <strong>Punten:</strong> 1 punt per gewonnen slag. Exact voorspeld? +10 bonus.
          </p>
          <p>
            Speel tegen <strong>Yuki</strong>, <strong>Max</strong> en <strong>Moppie</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="wood-btn wood-btn-lg mt-5 w-full"
        >
          Begrepen
        </button>
      </div>
    </div>
  )
}
