const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://handoff-api.onrender.com'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="1" y="1" width="11" height="11" rx="2" fill="#18a0fb" />
                <rect x="16" y="1" width="11" height="11" rx="2" fill="#18a0fb" opacity="0.4" />
                <rect x="1" y="16" width="11" height="11" rx="2" fill="#18a0fb" opacity="0.4" />
                <rect x="16" y="16" width="11" height="11" rx="2" fill="#18a0fb" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">Handoff</span>
          </div>

          {/* Subtitle */}
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            Acompanhe as mudanças de design<br />do seu time em tempo real
          </p>

          {/* Login button */}
          <a
            href={`${API_URL}/auth/figma`}
            className="w-full flex items-center justify-center gap-2 bg-[#18a0fb] hover:bg-[#0d8de8] text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 38 57" fill="currentColor">
              <path d="M19 28.5A9.5 9.5 0 1 1 28.5 19 9.5 9.5 0 0 1 19 28.5z"/>
              <path d="M9.5 57A9.5 9.5 0 0 1 9.5 38h9.5v9.5A9.5 9.5 0 0 1 9.5 57z"/>
              <path d="M0 28.5A9.5 9.5 0 0 1 9.5 19H19v19H9.5A9.5 9.5 0 0 1 0 28.5z"/>
              <path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19v19H9.5A9.5 9.5 0 0 1 0 9.5z"/>
              <path d="M19 0h9.5a9.5 9.5 0 0 1 0 19H19z"/>
            </svg>
            Entrar com Figma
          </a>

          {/* Footer */}
          <p className="text-xs text-gray-400">Feito para times de produto</p>
        </div>
      </div>
    </main>
  )
}
