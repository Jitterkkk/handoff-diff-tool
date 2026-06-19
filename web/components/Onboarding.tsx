const steps = [
  {
    title: 'Instale o plugin',
    description:
      "Abra o Figma, vá em Plugins → Procurar plugins e busque por 'Handoff Diff Tool'. Clique em Instalar.",
  },
  {
    title: 'Publique um review',
    description:
      'Selecione um frame no Figma, abra o plugin Handoff e clique em Publicar review. O plugin detecta automaticamente o que mudou.',
  },
  {
    title: 'Compartilhe com o dev',
    description:
      'Copie o link do review e mande para o desenvolvedor. Ele acessa sem precisar criar conta.',
  },
]

export function Onboarding() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 mb-4">
          <span className="text-2xl">⬡</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Bem-vindo ao Handoff
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Conecte o Figma ao seu time de desenvolvimento
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-10">
        {steps.map((step, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex gap-4"
          >
            <div className="shrink-0 w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center justify-center">
              {i + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {step.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <a
          href="https://github.com/Jitterkkk/handoff-diff-tool"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          Ver documentação no GitHub →
        </a>
      </div>
    </div>
  )
}
